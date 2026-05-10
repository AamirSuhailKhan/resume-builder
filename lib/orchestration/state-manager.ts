import { AgentRunStatus, Prisma, WorkflowStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { OrchestrationEventBus } from "./events";
import {
  AgentType,
  JsonObject,
  WorkflowRuntimeState,
  WorkflowStepDefinition,
  WorkflowType,
} from "./types";

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

export class WorkflowStateManager {
  static async load(userId: string, workflowId: string): Promise<WorkflowRuntimeState> {
    const workflow = await prisma.workflowRun.findFirst({
      where: { id: workflowId, userId },
      include: {
        agentRuns: {
          include: { steps: true },
        },
      },
    });

    if (!workflow) throw new Error("Workflow not found");

    const steps = workflow.agentRuns.flatMap((run) => run.steps);
    return {
      workflowId,
      userId,
      type: workflow.type as WorkflowType,
      status: workflow.status,
      completedStepIds: new Set(steps.filter((step) => ["completed", "waiting_for_approval"].includes(step.status)).map((step) => step.stepType)),
      failedStepIds: new Set(steps.filter((step) => step.status === "failed").map((step) => step.stepType)),
      activeStepIds: new Set(steps.filter((step) => ["running", "queued"].includes(step.status)).map((step) => step.stepType)),
    };
  }

  static async transitionWorkflow(params: {
    userId: string;
    workflowId: string;
    status: WorkflowStatus;
    traceId: string;
    reason?: string;
  }) {
    const terminal = ["completed", "failed", "canceled"].includes(params.status);
    const workflow = await prisma.workflowRun.update({
      where: { id: params.workflowId, userId: params.userId },
      data: compact({
        status: params.status,
        completedAt: terminal ? new Date() : undefined,
      }) as Prisma.WorkflowRunUncheckedUpdateInput,
    });

    await OrchestrationEventBus.publish(params.userId, {
      workflowId: params.workflowId,
      type: workflowEventForStatus(params.status),
      source: "state_manager",
      visibility: "user_visible",
      traceId: params.traceId,
      payload: {
        status: params.status,
        reason: params.reason,
      },
    });

    return workflow;
  }

  static async createAgentRun(params: {
    userId: string;
    workflowId: string;
    agentType: AgentType;
    step: WorkflowStepDefinition;
    traceId: string;
    input?: JsonObject | undefined;
  }) {
    const agentRun = await prisma.agentRun.create({
      data: {
        userId: params.userId,
        workflowId: params.workflowId,
        agentType: params.agentType,
        status: "running",
        input: params.input as Prisma.InputJsonValue,
        startedAt: new Date(),
        steps: {
          create: {
            stepType: params.step.id,
            status: "running",
            summary: params.step.name,
            input: params.input as Prisma.InputJsonValue,
            startedAt: new Date(),
          },
        },
      },
      include: { steps: true },
    });

    const step = agentRun.steps[0];
    await OrchestrationEventBus.publish(params.userId, {
      workflowId: params.workflowId,
      agentRunId: agentRun.id,
      stepId: step?.id,
      type: "step.started",
      source: "state_manager",
      visibility: "user_visible",
      traceId: params.traceId,
      payload: {
        stepDefinitionId: params.step.id,
        stepName: params.step.name,
        agentType: params.agentType,
      },
    });

    return { agentRun, stepRecord: step };
  }

  static async completeStep(params: {
    userId: string;
    workflowId: string;
    agentRunId: string;
    stepRecordId?: string | undefined;
    stepDefinitionId: string;
    traceId: string;
    summary: string;
    output?: JsonObject | undefined;
    status?: AgentRunStatus | undefined;
  }) {
    if (params.stepRecordId) {
      await prisma.agentStep.update({
        where: { id: params.stepRecordId },
        data: {
          status: params.status === "waiting_for_approval" ? "waiting_for_approval" : "completed",
          summary: params.summary,
          output: params.output as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    }

    await OrchestrationEventBus.publish(params.userId, {
      workflowId: params.workflowId,
      agentRunId: params.agentRunId,
      stepId: params.stepRecordId,
      type: params.status === "waiting_for_approval" ? "workflow.paused" : "step.completed",
      source: "state_manager",
      visibility: "user_visible",
      traceId: params.traceId,
      payload: {
        stepDefinitionId: params.stepDefinitionId,
        summary: params.summary,
      },
    });
  }

  static async failStep(params: {
    userId: string;
    workflowId: string;
    agentRunId?: string | undefined;
    stepRecordId?: string | undefined;
    stepDefinitionId: string;
    traceId: string;
    error: string;
  }) {
    if (params.stepRecordId) {
      await prisma.agentStep.update({
        where: { id: params.stepRecordId },
        data: {
          status: "failed",
          error: params.error,
          completedAt: new Date(),
        },
      });
    }

    await OrchestrationEventBus.publish(params.userId, {
      workflowId: params.workflowId,
      agentRunId: params.agentRunId,
      stepId: params.stepRecordId,
      type: "step.failed",
      source: "state_manager",
      visibility: "user_visible",
      traceId: params.traceId,
      payload: {
        stepDefinitionId: params.stepDefinitionId,
        error: params.error,
      },
    });
  }
}

function workflowEventForStatus(status: WorkflowStatus) {
  switch (status) {
    case "running":
      return "workflow.started";
    case "waiting_for_approval":
      return "workflow.paused";
    case "completed":
      return "workflow.completed";
    case "failed":
      return "workflow.failed";
    case "canceled":
      return "workflow.canceled";
    default:
      return "workflow.resumed";
  }
}
