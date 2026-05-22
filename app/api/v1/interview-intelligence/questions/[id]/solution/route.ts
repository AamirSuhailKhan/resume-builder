import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const params = await context.params;
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return apiError("Invalid question id.", 400);
    const solution = await InterviewIntelligenceService.generateSolution(parsed.data.id);
    return apiOk(solution, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
