import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  userMessage: z.string().min(1).max(3000),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).default([]),
});

type SimResponse = { reply: string; suggestion?: string };

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const negotiationId = parsed.data.sessionId ?? id;
  const negotiation = await prisma.negotiationSession.findFirst({ where: { id: negotiationId, userId } });
  if (!negotiation) return NextResponse.json({ error: "Negotiation session not found." }, { status: 404 });

  let result: SimResponse = {
    reply: "Thanks for sharing that. The offer is competitive for our band, but I can review whether there is flexibility if you can share the range you had in mind.",
    suggestion: "Anchor with appreciation first, then name a specific number and the market reason behind it.",
  };

  try {
    const { data } = await callClaudeJson<SimResponse>({
      system: `You are a professional HR recruiter at ${negotiation.companyName}. The candidate has been offered ${negotiation.offerBase}. You are negotiating salary. Be realistic, push back on aggressive asks, be flexible on reasonable ones. Return ONLY JSON with reply and suggestion.`,
      user: JSON.stringify({
        conversationHistory: parsed.data.conversationHistory,
        userMessage: parsed.data.userMessage,
        instruction: "Reply in character in 2-3 sentences max. suggestion is private coaching advice for the candidate.",
      }),
      maxTokens: 700,
    });
    result = data;
  } catch {
    // Keep fallback recruiter response.
  }

  const log = [
    ...negotiation.negotiationLog,
    { role: "user", message: parsed.data.userMessage, timestamp: new Date().toISOString() },
    { role: "assistant", message: result.reply, suggestion: result.suggestion, timestamp: new Date().toISOString() },
  ];

  await prisma.negotiationSession.update({
    where: { id: negotiation.id },
    data: { negotiationLog: log as Prisma.InputJsonValue[] },
  });

  return NextResponse.json(result);
}
