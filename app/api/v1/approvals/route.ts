import { NextRequest } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";

export const runtime = "nodejs";

const createApprovalSchema = z.object({
  workflowId: z.string().uuid().optional(),
  type: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(4000),
  payload: z.record(z.string(), z.unknown()),
  riskFlags: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = statusParam
      ? z.nativeEnum(ApprovalStatus).parse(statusParam)
      : undefined;
    const approvals = await CareerOSService.listApprovalRequests(user.id, status);
    return apiOk(approvals);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createApprovalSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid approval request.", 400);

    const approval = await CareerOSService.createApprovalRequest(user.id, {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });
    return apiOk(approval, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
