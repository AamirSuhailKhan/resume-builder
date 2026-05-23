import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { SnapshotAggregatorService } from "@/lib/interview-intelligence/snapshot.engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateSchema = z.object({
  companyId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // In production, ensure admin/system authorization

    const body = await req.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid request. Must provide companyId.", 400);

    const snapshot = await SnapshotAggregatorService.generateSnapshot(parsed.data.companyId);
    
    if (!snapshot) {
      return apiError("Could not generate snapshot. Not enough historical data.", 400);
    }

    return apiOk(snapshot, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
