import { google } from "@ai-sdk/google";
import type { UIMessage } from "ai";
import { convertToModelMessages, streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CoachPaywallError, requirePro } from "@/lib/auth/require-pro";
import { buildCoachSystemPrompt } from "@/lib/coach-context";
import {
  detectMockInterviewIntent,
  mergeMockMetadata,
  parseCoachMetaFromAssistant,
  parseMockMetadata,
  stripCoachMeta,
} from "@/lib/coach/mock-interview";
import type { StoredCoachMessage } from "@/lib/coach/types";
import { applyRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";
import { CoachService } from "@/lib/services/coach.service";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  sessionId: z.string().uuid(),
});

function uiMessagesToStored(messages: UIMessage[]): StoredCoachMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const textParts = m.parts?.filter((p) => p.type === "text") ?? [];
      const content = textParts.map((p) => ("text" in p ? p.text : "")).join("") || "";
      return {
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.role === "assistant" ? stripCoachMeta(content) : content,
        createdAt: new Date().toISOString(),
      };
    });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePro();
    const rateLimited = await applyRateLimit(req, user.id, "ai");
    if (rateLimited) return rateLimited;

    const burstLimited = await applyRateLimit(req, getClientIdentifier(req), "ai");
    if (burstLimited) return burstLimited;

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { sessionId, messages } = parsed.data;

    const usageCheck = await CoachService.checkAndIncrementUsage(user.id, user.plan);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: `Daily coach message limit reached (${usageCheck.limit}/day). Resets at midnight UTC.`,
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    const session = await CoachService.getSession(user.id, sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const lastUserText =
      lastUserMessage?.parts
        ?.filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("") ?? "";

    let mode = session.mode;
    let metadata = parseMockMetadata(session.metadata);

    if (detectMockInterviewIntent(lastUserText)) {
      mode = "mock_interview";
      metadata = metadata ?? { phase: "setup", questionIndex: 0, scores: [] };
    }

    const system = await buildCoachSystemPrompt(user.id, {
      mode,
      metadata: metadata ?? undefined,
    });

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI service is not configured." }, { status: 503 });
    }

    // Map GEMINI_API_KEY to GOOGLE_GENERATIVE_AI_API_KEY for `@ai-sdk/google`
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system,
      messages: modelMessages,
      maxOutputTokens: 4096,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: finishedMessages }) => {
        const stored = uiMessagesToStored(finishedMessages);
        const lastAssistant = [...finishedMessages].reverse().find((m) => m.role === "assistant");
        const assistantText =
          lastAssistant?.parts
            ?.filter((p) => p.type === "text")
            .map((p) => ("text" in p ? p.text : ""))
            .join("") ?? "";

        let updatedMeta = metadata;
        if (mode === "mock_interview" && updatedMeta) {
          const metaUpdate = parseCoachMetaFromAssistant(assistantText);
          if (metaUpdate) {
            updatedMeta = mergeMockMetadata(updatedMeta, metaUpdate);
          }
        }

        const firstUser = stored.find((m) => m.role === "user");
        const title =
          session!.title === "New conversation" && firstUser
            ? firstUser.content.slice(0, 60)
            : undefined;

        const updatePayload: {
          messages: typeof stored;
          mode: string;
          metadata?: object;
        } = {
          messages: stored,
          mode,
        };
        if (updatedMeta) updatePayload.metadata = updatedMeta;
        await CoachService.updateSession(user.id, sessionId, updatePayload);

        if (title) {
          await CoachService.updateSession(user.id, sessionId, { title });
        }
      },
    });
  } catch (error) {
    if (error instanceof CoachPaywallError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          upgradeUrl: error.upgradeUrl,
        },
        { status: 402 }
      );
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
    }
    console.error("[coach]", error);
    return NextResponse.json({ error: "Coach is temporarily unavailable." }, { status: 500 });
  }
}
