import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";
import { WorkflowCoordinator } from "@/lib/orchestration";

export const runtime = "nodejs";

const decisionSchema = z.object({
  note: z.string().trim().max(2000).optional(),
  editedPayload: z.record(z.string(), z.unknown()).optional(),
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
    const approval = await CareerOSService.decideApproval(user.id, id, "approved", decision);
    if (approval.workflowId) {
      await WorkflowCoordinator.resume(user.id, approval.workflowId, "approval");
    }
    return apiOk(approval);
  } catch (error) {
    return errorToResponse(error);
  }
}
