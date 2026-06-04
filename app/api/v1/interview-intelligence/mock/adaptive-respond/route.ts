import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const RespondRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID."),
  candidateResponse: z.string().trim().min(5, "Response is too short to process."),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = RespondRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid response request.", 400);
    }

    const { sessionId, candidateResponse } = parsed.data;
    return apiOk(await InterviewAIV4Service.processMockResponse(user.id, sessionId, candidateResponse));
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
