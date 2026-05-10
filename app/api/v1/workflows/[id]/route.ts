import { NextRequest } from "next/server";
import { WorkflowStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";

export const runtime = "nodejs";

const updateWorkflowSchema = z.object({
  status: z.nativeEnum(WorkflowStatus),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const workflow = await CareerOSService.getWorkflowRun(user.id, id);
    if (!workflow) return apiError("Workflow not found.", 404);
    return apiOk(workflow);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateWorkflowSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid workflow status.", 400);

    const workflow = await CareerOSService.updateWorkflowStatus(user.id, id, parsed.data.status);
    return apiOk(workflow);
  } catch (error) {
    return errorToResponse(error);
  }
}
