import { ApprovalStatus } from "@prisma/client";
import { CareerOSService } from "@/lib/services/career-os.service";
import { ApprovalPause, ApprovalRequestInput } from "./types";
import { OrchestrationEventBus } from "./events";

export class ApprovalManager {
  static async request(params: {
    userId: string;
    workflowId: string;
    agentRunId?: string | undefined;
    stepId?: string | undefined;
    traceId: string;
    approval: ApprovalRequestInput;
  }): Promise<ApprovalPause> {
    const request = await CareerOSService.createApprovalRequest(params.userId, {
      workflowId: params.workflowId,
      type: params.approval.type,
      title: params.approval.title,
      summary: params.approval.summary,
      payload: params.approval.payload,
      riskFlags: params.approval.riskFlags,
      expiresAt: params.approval.expiresAt,
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
    const pending = await CareerOSService.listApprovalRequests(userId, "pending" as ApprovalStatus);
    return pending.some((approval) =>
      approval.workflowId === workflowId && (type ? approval.type === type : true)
    );
  }
}
