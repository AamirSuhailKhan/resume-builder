import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const EvaluateRequestSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID."),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    console.log("REQUEST BODY", body);
    const parsed = EvaluateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid evaluation request.", 400);
    }

    const { sessionId } = parsed.data;
    return apiOk(await InterviewAIV4Service.evaluateMockSession(user.id, sessionId));
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
