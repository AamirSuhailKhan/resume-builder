import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const StartRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  roleTitle: z.string().trim().min(1, "Role title is required."),
  companyName: z.string().trim().optional(),
  resumeText: z.string().trim().optional(),
  mode: z.string().default("mixed"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    console.log("REQUEST BODY", body);
    const parsed = StartRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid start request.", 400);
    }

    const { roleTitle, companyName, mode, sessionId } = parsed.data;

    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const company = companyName ? await InterviewAIV4Service.ensureCompany(companyName) : null;
      const session = await prisma.interviewMockSession.create({
        data: {
          userId: user.id,
          companyId: company?.id ?? null,
          roleTitle,
          mode,
          status: "profile_ready",
          rounds: {
            create: [
              {
                roundNumber: 1,
                type: mode === "mixed" ? "technical" : mode,
                name: mode === "mixed" ? "Technical Deep Dive" : `${mode.replace(/_/g, " ")} Round`,
                durationMinutes: 45,
                status: "ready",
                focusAreas: ["role requirements"],
                expectedSignals: ["specificity", "tradeoffs", "communication"],
              },
            ],
          },
        },
      });
      targetSessionId = session.id;
    }

    const started = await InterviewAIV4Service.startMockRound(user.id, targetSessionId);
    return apiOk(started, 201);
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
