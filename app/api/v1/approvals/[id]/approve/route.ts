import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { enqueueJob } from "@/lib/queue/producer";
import { OrchestrationEventBus } from "@/lib/orchestration/events";
import { WorkflowStateManager } from "@/lib/orchestration/state-manager";

export const runtime = "nodejs";

const decisionSchema = z.object({
  note: z.string().trim().max(2000).optional(),
  editedPayload: z.record(z.string(), z.unknown()).optional(),
}).optional();

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringField(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" && entry.length > 0 ? entry : undefined;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

function findAutoApplyJobForWorkflow(
  jobs: Array<{ id: string; resumeId: string | null; payload: Prisma.JsonValue }>,
  workflowId: string
) {
  return jobs.find((job) => stringField(job.payload, "workflowRunId") === workflowId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return apiError("Please sign in to continue.", 401);

    const { id } = await params;
    const body = await req.json().catch(() => undefined);
    const decision = decisionSchema.parse(body);
    const existing = await prisma.approvalRequest.findFirst({
      where: { id, userId },
    });
    if (!existing) return apiError("Approval request not found.", 404);
    if (existing.status !== "pending") return apiError("Approval request has already been decided.", 409);

    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: compact({
        status: "approved",
        decision: decision as Prisma.InputJsonValue,
        decidedAt: new Date(),
      }) as Prisma.ApprovalRequestUncheckedUpdateInput,
    });

    if (approval.workflowId) {
      const traceId = crypto.randomUUID();
      await OrchestrationEventBus.publish(userId, {
        workflowId: approval.workflowId,
        type: "approval.approved",
        source: "approval_api",
        visibility: "user_visible",
        traceId,
        payload: compact({
          approvalId: approval.id,
          note: decision?.note,
        }),
      });

      await WorkflowStateManager.transitionWorkflow({
        userId,
        workflowId: approval.workflowId,
        status: "queued",
        traceId,
        reason: "Approval granted; auto-apply continuation queued.",
      });

      const previousJobs = await prisma.job.findMany({
        where: { userId, type: "ai_auto_apply" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, resumeId: true, payload: true },
      });
      const originalJob = findAutoApplyJobForWorkflow(previousJobs, approval.workflowId);

      if (originalJob) {
        const originalPayload = asRecord(originalJob.payload);
        const nextPayload = {
          ...originalPayload,
          workflowRunId: approval.workflowId,
          approvalId: approval.id,
          continuationOfJobRecordId: originalJob.id,
        };
        const nextJob = await prisma.job.create({
          data: {
            userId,
            resumeId: originalJob.resumeId,
            type: "ai_auto_apply",
            status: "queued",
            payload: nextPayload as Prisma.InputJsonValue,
          },
        });

        await enqueueJob("ai_auto_apply", {
          jobRecordId: nextJob.id,
          userId,
          ...(typeof originalPayload.resumeId === "string"
            ? { resumeId: originalPayload.resumeId }
            : originalJob.resumeId
              ? { resumeId: originalJob.resumeId }
              : {}),
          ...(typeof originalPayload.jobOpportunityId === "string" ? { jobOpportunityId: originalPayload.jobOpportunityId } : {}),
          ...(typeof originalPayload.preview === "string" ? { preview: originalPayload.preview } : {}),
        });
      }
    }
    return apiOk(approval);
  } catch (error) {
    return errorToResponse(error);
  }
}
