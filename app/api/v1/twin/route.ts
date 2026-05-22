import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerTwinService } from "@/lib/twin/career-twin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privacySchema = z.object({
  memoryEnabled: z.boolean().optional(),
  aiTrainingAllowed: z.boolean().optional(),
  sensitiveFieldsRequireApproval: z.boolean().optional(),
  executionReplayEnabled: z.boolean().optional(),
  retention: z.record(z.string(), z.number().int().positive()).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const twin = await CareerTwinService.getSnapshot(user.id);
    return apiOk(twin);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : "manual_refresh";
    await CareerTwinService.evolve(user.id, reason);
    const twin = await CareerTwinService.getSnapshot(user.id);
    return apiOk(twin);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = privacySchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid privacy controls.", 400);
    const twin = await CareerTwinService.updatePrivacy(user.id, parsed.data);
    return apiOk(twin);
  } catch (error) {
    return errorToResponse(error);
  }
}
