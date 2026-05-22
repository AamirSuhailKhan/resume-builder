import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const predictSchema = z.object({
  query: z.string().trim().min(2).max(300),
  companyName: z.string().trim().max(120).optional(),
  roleTitle: z.string().trim().max(160).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => null);
    const parsed = predictSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid prediction request.", 400);
    const prediction = await InterviewIntelligenceService.predict({
      query: parsed.data.query,
      ...(parsed.data.companyName ? { companyName: parsed.data.companyName } : {}),
      ...(parsed.data.roleTitle ? { roleTitle: parsed.data.roleTitle } : {}),
      ...(user?.id ? { userId: user.id } : {}),
    });
    return apiOk(prediction, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
