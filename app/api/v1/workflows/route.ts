import { NextRequest } from "next/server";
import { WorkflowStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";
import { WorkflowCoordinator } from "@/lib/orchestration";
import { workflowTypes } from "@/lib/orchestration/types";

export const runtime = "nodejs";

const createWorkflowSchema = z.object({
  type: z.enum(workflowTypes),
  goal: z.string().trim().min(1).max(2000),
  status: z.nativeEnum(WorkflowStatus).optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  policy: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  start: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
    const workflows = await CareerOSService.listWorkflowRuns(
      user.id,
      Number.isFinite(limit) ? limit : 20
    );
    return apiOk(workflows);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createWorkflowSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid workflow data.", 400);

    if (parsed.data.start) {
      const workflow = await WorkflowCoordinator.createAndStart({
        userId: user.id,
        type: parsed.data.type,
        goal: parsed.data.goal,
        ...(parsed.data.metadata ? { input: parsed.data.metadata } : {}),
      });
      return apiOk(workflow, 201);
    }

    const workflow = await CareerOSService.createWorkflowRun(user.id, parsed.data);
    return apiOk(workflow, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
