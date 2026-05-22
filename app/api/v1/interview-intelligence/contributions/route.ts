import { NextRequest } from "next/server";
import { InterviewContributionType } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contributionSchema = z.object({
  type: z.nativeEnum(InterviewContributionType),
  companyName: z.string().trim().min(1).max(120),
  roleTitle: z.string().trim().max(160).optional(),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = contributionSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid contribution.", 400);
    const contribution = await InterviewIntelligenceService.submitContribution(user.id, {
      type: parsed.data.type,
      companyName: parsed.data.companyName,
      payload: parsed.data.payload,
      ...(parsed.data.roleTitle ? { roleTitle: parsed.data.roleTitle } : {}),
    });
    return apiOk(contribution, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
