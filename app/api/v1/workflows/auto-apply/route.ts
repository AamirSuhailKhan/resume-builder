import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { enqueueJob } from "@/lib/queue/producer";
import { errorToResponse } from "@/lib/api/response";
import { OrchestrationEventBus } from "@/lib/orchestration/events";
import { WorkflowStateManager } from "@/lib/orchestration/state-manager";
import { getWorkflowDefinition } from "@/lib/orchestration/workflow-definitions";

export const runtime = "nodejs";

const autoApplySchema = z.object({
  resumeId: z.string().uuid().optional(),
  jobOpportunityId: z.string().uuid().optional(),
  targetUrl: z.string().trim().url().max(2048).optional(),
  preview: z.string().max(30000).optional(),
  goal: z.string().trim().min(1).max(2000).optional(),
  mode: z.enum(["co_pilot", "draft_only"]).default("co_pilot"),
});

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

function json(data: unknown, status: number) {
  return NextResponse.json({ data, error: null }, { status });
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError("Please sign in to continue.", 401);

    const body = await req.json().catch(() => null);
    const parsed = autoApplySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid auto-apply workflow data.", 400);

    if (parsed.data.resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: parsed.data.resumeId, userId },
        select: { id: true },
      });
      if (!resume) return jsonError("Resume not found.", 404);
    }

    if (parsed.data.jobOpportunityId) {
      const opportunity = await prisma.jobOpportunity.findFirst({
        where: { id: parsed.data.jobOpportunityId, userId },
        select: { id: true },
      });
      if (!opportunity) return jsonError("Job opportunity not found.", 404);
    }

    const definition = getWorkflowDefinition("auto_apply");
    const traceId = crypto.randomUUID();
    const input = compact({
      resumeId: parsed.data.resumeId,
      jobOpportunityId: parsed.data.jobOpportunityId,
      targetUrl: parsed.data.targetUrl,
      preview: parsed.data.preview,
      mode: parsed.data.mode,
    });
    const goal = parsed.data.goal ?? "Prepare and run an approval-gated auto-apply workflow.";

    const { workflow, jobRecord } = await prisma.$transaction(async (tx) => {
      const workflowRun = await tx.workflowRun.create({
        data: {
          userId,
          type: "auto_apply",
          status: "planned",
          goal,
          plan: {
            graphVersion: definition.version,
            steps: definition.steps,
          } as Prisma.InputJsonValue,
          metadata: {
            input,
            orchestration: "career-os-v1",
            queue: "ai_auto_apply",
          } as Prisma.InputJsonValue,
          policy: {
            approvalRequiredFor: ["application_submit", "sensitive_form_field"],
          } as Prisma.InputJsonValue,
        },
      });

      const queuePayload = compact({
        workflowRunId: workflowRun.id,
        resumeId: parsed.data.resumeId,
        jobOpportunityId: parsed.data.jobOpportunityId,
        targetUrl: parsed.data.targetUrl,
        preview: parsed.data.preview,
        mode: parsed.data.mode,
      });

      const queueJob = await tx.job.create({
        data: {
          userId,
          resumeId: parsed.data.resumeId ?? null,
          type: "ai_auto_apply",
          status: "queued",
          payload: queuePayload as Prisma.InputJsonValue,
        },
      });

      return { workflow: workflowRun, jobRecord: queueJob };
    });

    await OrchestrationEventBus.publish(userId, {
      workflowId: workflow.id,
      type: "workflow.created",
      source: "auto_apply_api",
      visibility: "user_visible",
      traceId,
      payload: {
        workflowType: "auto_apply",
        goal,
        jobRecordId: jobRecord.id,
      },
    });

    await WorkflowStateManager.transitionWorkflow({
      userId,
      workflowId: workflow.id,
      status: "queued",
      traceId,
      reason: "Auto-apply workflow queued.",
    });

    try {
      await enqueueJob("ai_auto_apply", {
        jobRecordId: jobRecord.id,
        userId,
        ...(parsed.data.resumeId ? { resumeId: parsed.data.resumeId } : {}),
        ...(parsed.data.jobOpportunityId ? { jobOpportunityId: parsed.data.jobOpportunityId } : {}),
        ...(parsed.data.preview ? { preview: parsed.data.preview } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enqueue auto-apply workflow.";
      await WorkflowStateManager.transitionWorkflow({
        userId,
        workflowId: workflow.id,
        status: "failed",
        traceId,
        reason: message,
      }).catch(() => undefined);
      throw error;
    }

    return json({
      workflowRunId: workflow.id,
      jobRecordId: jobRecord.id,
      status: "queued",
      traceId,
    }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
