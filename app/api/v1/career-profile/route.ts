import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";

export const runtime = "nodejs";

const jsonRecord = z.record(z.string(), z.unknown());

const updateProfileSchema = z.object({
  headline: z.string().trim().max(160).nullable().optional(),
  summary: z.string().trim().max(4000).nullable().optional(),
  goals: jsonRecord.optional(),
  preferences: jsonRecord.optional(),
  constraints: jsonRecord.optional(),
  salaryExpectation: jsonRecord.nullable().optional(),
  autonomyPolicy: jsonRecord.optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await CareerOSService.getOrCreateProfile(user.id);
    return apiOk(profile);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid career profile data.", 400);

    const profile = await CareerOSService.updateProfile(user.id, parsed.data);
    return apiOk(profile);
  } catch (error) {
    return errorToResponse(error);
  }
}
