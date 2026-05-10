import "server-only";
import { WorkflowStatus } from "@prisma/client";
import { z } from "zod";
import { CareerOSService } from "@/lib/services/career-os.service";
import { OrchestrationEventBus } from "./events";
import { enqueueWorkflowExecution } from "./queue";
import { WorkflowType, workflowTypes } from "./types";
import { getWorkflowDefinition } from "./workflow-definitions";

const workflowTypeSchema = z.enum(workflowTypes);

export class WorkflowCoordinator {
  static async createAndStart(params: {
    userId: string;
    type: WorkflowType;
    goal: string;
    input?: Record<string, unknown>;
  }) {
    const type = workflowTypeSchema.parse(params.type);
    const definition = getWorkflowDefinition(type);
    const traceId = crypto.randomUUID();
    const workflow = await CareerOSService.createWorkflowRun(params.userId, {
      type,
      goal: params.goal,
      status: "queued",
      plan: {
        graphVersion: definition.version,
        steps: definition.steps,
      },
      metadata: {
        input: params.input ?? {},
        orchestration: "career-os-v1",
      },
    });

    await OrchestrationEventBus.publish(params.userId, {
      workflowId: workflow.id,
      type: "workflow.created",
      source: "workflow_coordinator",
      visibility: "user_visible",
      traceId,
      payload: {
        workflowType: type,
        goal: params.goal,
        graphVersion: definition.version,
      },
    });

    await enqueueWorkflowExecution({
      userId: params.userId,
      workflowId: workflow.id,
      requestedBy: "user",
      traceId,
    });

    return workflow;
  }

  static async startExisting(userId: string, workflowId: string) {
    const traceId = crypto.randomUUID();
    await CareerOSService.updateWorkflowStatus(userId, workflowId, "queued" as WorkflowStatus);
    await enqueueWorkflowExecution({
      userId,
      workflowId,
      requestedBy: "user",
      traceId,
    });
    return { workflowId, traceId };
  }

  static async resume(userId: string, workflowId: string, source: "approval" | "user" = "user") {
    const traceId = crypto.randomUUID();
    await CareerOSService.updateWorkflowStatus(userId, workflowId, "queued" as WorkflowStatus);
    await OrchestrationEventBus.publish(userId, {
      workflowId,
      type: "workflow.resumed",
      source: "workflow_coordinator",
      visibility: "user_visible",
      traceId,
      payload: { source },
    });
    await enqueueWorkflowExecution({
      userId,
      workflowId,
      requestedBy: source,
      traceId,
    });
    return { workflowId, traceId };
  }

  static async cancel(userId: string, workflowId: string, reason?: string) {
    const traceId = crypto.randomUUID();
    const workflow = await CareerOSService.updateWorkflowStatus(userId, workflowId, "canceled" as WorkflowStatus);
    await OrchestrationEventBus.publish(userId, {
      workflowId,
      type: "workflow.canceled",
      source: "workflow_coordinator",
      visibility: "user_visible",
      traceId,
      payload: { reason: reason ?? "Canceled by user" },
    });
    return workflow;
  }
}
