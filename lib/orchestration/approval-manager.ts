import { ApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditEvent } from "@/lib/domain/audit/audit.service";
import { ApprovalPause, ApprovalRequestInput } from "./types";
import { OrchestrationEventBus } from "./events";

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

export class ApprovalManager {
  static async request(params: {
    userId: string;
    workflowId: string;
    agentRunId?: string | undefined;
    stepId?: string | undefined;
    traceId: string;
    approval: ApprovalRequestInput;
  }): Promise<ApprovalPause> {
    const request = await prisma.approvalRequest.create({
      data: compact({
        userId: params.userId,
        workflowId: params.workflowId,
        type: params.approval.type,
        title: params.approval.title,
        summary: params.approval.summary,
        payload: params.approval.payload as Prisma.InputJsonValue,
        riskFlags: params.approval.riskFlags as Prisma.InputJsonValue | undefined,
        expiresAt: params.approval.expiresAt,
      }) as Prisma.ApprovalRequestUncheckedCreateInput,
    });

    await writeAuditEvent({
      userId: params.userId,
      action: "approval.requested",
      entityType: "ApprovalRequest",
      entityId: request.id,
      metadata: { type: request.type },
    });

    await OrchestrationEventBus.publish(params.userId, {
      workflowId: params.workflowId,
      agentRunId: params.agentRunId,
      stepId: params.stepId,
      type: "approval.requested",
      source: "approval_manager",
      visibility: "user_visible",
      traceId: params.traceId,
      payload: {
        approvalId: request.id,
        approvalType: request.type,
        title: request.title,
        summary: request.summary,
      },
    });

    return {
      approvalId: request.id,
      status: request.status,
    };
  }

  static async hasPendingApproval(userId: string, workflowId: string, type?: string) {
    const pending = await prisma.approvalRequest.findMany({
      where: {
        userId,
        workflowId,
        status: "pending" as ApprovalStatus,
        ...(type ? { type } : {}),
      },
      select: { id: true },
      take: 1,
    });
    return pending.length > 0;
  }
}
