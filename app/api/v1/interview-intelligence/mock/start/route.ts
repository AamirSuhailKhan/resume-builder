import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startSchema = z.object({
  companyName: z.string().trim().max(120).optional(),
  roleTitle: z.string().trim().min(1).max(160),
  mode: z.enum(["coding", "behavioral", "system_design", "mixed"]).default("mixed"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid mock interview request.", 400);
    const session = await InterviewIntelligenceService.startMockSession(user.id, {
      roleTitle: parsed.data.roleTitle,
      ...(parsed.data.companyName ? { companyName: parsed.data.companyName } : {}),
      ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
    });
    return apiOk(session, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
