import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";
import { OrchestrationEventBus } from "@/lib/orchestration";

export const runtime = "nodejs";

const decisionSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
}).optional();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => undefined);
    const decision = decisionSchema.parse(body);
    const approval = await CareerOSService.decideApproval(user.id, id, "rejected", decision);
    if (approval.workflowId) {
      await OrchestrationEventBus.publish(user.id, {
        workflowId: approval.workflowId,
        type: "approval.rejected",
        source: "approval_api",
        visibility: "user_visible",
        payload: {
          approvalId: approval.id,
          reason: decision?.reason,
        },
      });
    }
    return apiOk(approval);
  } catch (error) {
    return errorToResponse(error);
  }
}
