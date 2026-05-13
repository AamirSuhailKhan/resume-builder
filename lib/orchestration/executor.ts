import { prisma } from "@/lib/db/prisma";
import { metrics } from "@/lib/metrics";
import { ApprovalManager } from "./approval-manager";
import { AgentRegistry } from "./agent-registry";
import { builtInAgents } from "./agents";
import { OrchestrationEventBus } from "./events";
import { MemoryRetriever } from "./memory";
import { classifyFailure, computeBackoffMs, mergeRetryPolicy } from "./policies";
import { WorkflowStateManager } from "./state-manager";
import { defaultToolRegistry } from "./tools";
import {
  AgentContext,
  StepExecutionDecision,
  WorkflowExecutionInput,
  WorkflowGraphDefinition,
  WorkflowStepDefinition,
} from "./types";
import { getWorkflowDefinition } from "./workflow-definitions";

const defaultAgentRegistry = new AgentRegistry();
for (const agent of builtInAgents) defaultAgentRegistry.register(agent);

export class WorkflowExecutor {
  constructor(
    private readonly agentRegistry = defaultAgentRegistry
  ) {}

  async execute(input: WorkflowExecutionInput) {
    const traceId = input.traceId ?? crypto.randomUUID();
    const startedAt = Date.now();
    const workflow = await prisma.workflowRun.findFirst({
      where: { id: input.workflowId, userId: input.userId },
      include: { agentRuns: { include: { steps: true } }, approvalRequests: true },
    });
    if (!workflow) throw new Error("Workflow not found");
    if (["completed", "failed", "canceled"].includes(workflow.status)) {
      return { status: workflow.status, reason: "Workflow is terminal" };
    }

    const definition = getWorkflowDefinition(workflow.type as never);
    await WorkflowStateManager.transitionWorkflow({
      userId: input.userId,
      workflowId: input.workflowId,
      status: "running",
      traceId,
      reason: `Execution requested by ${input.requestedBy}`,
    });

    let guard = 0;
    while (guard < definition.steps.length + 5) {
      guard++;
      const decision = await this.nextDecision(input.userId, input.workflowId, definition, input.stepId);

      if (decision.action === "complete") {
        await WorkflowStateManager.transitionWorkflow({
          userId: input.userId,
          workflowId: input.workflowId,
          status: "completed",
          traceId,
          reason: decision.reason,
        });
        metrics.timing("orchestration.workflow.duration_ms", Date.now() - startedAt, {
          workflowType: definition.type,
          status: "completed",
        });
        return { status: "completed", reason: decision.reason };
      }

      if (decision.action === "wait") {
        await WorkflowStateManager.transitionWorkflow({
          userId: input.userId,
          workflowId: input.workflowId,
          status: "waiting_for_approval",
          traceId,
          reason: decision.reason,
        });
        return { status: "waiting_for_approval", reason: decision.reason };
      }

      if (decision.action === "fail") {
        await WorkflowStateManager.transitionWorkflow({
          userId: input.userId,
          workflowId: input.workflowId,
          status: "failed",
          traceId,
          reason: decision.reason,
        });
        return { status: "failed", reason: decision.reason };
      }

      await this.executeStep(input.userId, input.workflowId, definition, decision.step, traceId);

      if (input.stepId) {
        return { status: "step_completed", stepId: input.stepId };
      }
    }

    throw new Error("Workflow execution guard tripped");
  }

  private async nextDecision(
    userId: string,
    workflowId: string,
    definition: WorkflowGraphDefinition,
    forcedStepId?: string
  ): Promise<StepExecutionDecision> {
    const state = await WorkflowStateManager.load(userId, workflowId);
    if (state.status === "waiting_for_approval") {
      const hasApproval = await ApprovalManager.hasPendingApproval(userId, workflowId);
      if (hasApproval) return { action: "wait", reason: "Waiting for approval" };
    }

    const completed = state.completedStepIds;
    const failed = state.failedStepIds;

    if (forcedStepId) {
      const forced = definition.steps.find((step) => step.id === forcedStepId);
      if (!forced) return { action: "fail", reason: `Unknown step: ${forcedStepId}` };
      return { action: "execute", step: forced };
    }

    for (const step of definition.steps) {
      if (completed.has(step.id)) continue;
      if (failed.has(step.id)) return { action: "fail", reason: `Step failed: ${step.id}` };
      const dependencies = step.dependsOn ?? [];
      const ready = dependencies.every((dep) => completed.has(dep));
      if (ready) return { action: "execute", step };
    }

    return { action: "complete", reason: "All workflow steps completed" };
  }

  private async executeStep(
    userId: string,
    workflowId: string,
    definition: WorkflowGraphDefinition,
    step: WorkflowStepDefinition,
    traceId: string
  ) {
    if (step.kind === "approval") {
      await ApprovalManager.request({
        userId,
        workflowId,
        traceId,
        stepId: step.id,
        approval: {
          type: step.approval?.type ?? step.id,
          title: step.approval?.title ?? step.name,
          summary: step.approval?.summary ?? "Approval is required to continue.",
          payload: step.approval?.payload ?? { workflowId, stepId: step.id },
          riskFlags: step.approval?.riskFlags,
        },
      });
      return;
    }

    if (step.kind !== "agent" || !step.agentType) {
      await OrchestrationEventBus.publish(userId, {
        workflowId,
        stepId: step.id,
        type: "step.completed",
        source: "workflow_executor",
        visibility: "internal",
        traceId,
        payload: { skipped: true, kind: step.kind },
      });
      return;
    }

    const policy = mergeRetryPolicy(definition.defaultRetry, step.retry);
    const previousAttempts = await prisma.agentStep.count({
      where: {
        agentRun: { workflowId },
        stepType: step.id,
      },
    });
    const attempt = previousAttempts + 1;

    const { agentRun, stepRecord } = await WorkflowStateManager.createAgentRun({
      userId,
      workflowId,
      agentType: step.agentType,
      step,
      traceId,
      input: step.input,
    });

    try {
      const memory = await MemoryRetriever.retrieve({
        userId,
        intent: MemoryRetriever.intentForWorkflow(definition.type),
        input: step.input,
        query: `${definition.name} ${step.name}`,
      });

      await OrchestrationEventBus.publish(userId, {
        workflowId,
        agentRunId: agentRun.id,
        stepId: stepRecord?.id,
        type: "memory.retrieved",
        source: "memory_retriever",
        visibility: "internal",
        traceId,
        payload: { count: memory.length, intent: MemoryRetriever.intentForWorkflow(definition.type) },
      });

      const agent = this.agentRegistry.get(step.agentType);
      const context: AgentContext = {
        userId,
        workflowId,
        agentRunId: agentRun.id,
        traceId,
        workflowType: definition.type,
        step,
        input: step.input ?? {},
        memory,
        budget: {
          modelTier: "medium",
          maxPromptTokens: 6_000,
          maxCompletionTokens: 1_500,
          maxCostUsd: 0.05,
        },
        tools: defaultToolRegistry.view({} as AgentContext),
        emit: (event) => OrchestrationEventBus.publish(userId, { ...event, traceId: event.traceId ?? traceId }),
        requireApproval: (approval) => ApprovalManager.request({
          userId,
          workflowId,
          agentRunId: agentRun.id,
          stepId: stepRecord?.id,
          traceId,
          approval,
        }),
      };
      context.tools = defaultToolRegistry.view(context);

      const result = await agent.run(context);
      await WorkflowStateManager.completeStep({
        userId,
        workflowId,
        agentRunId: agentRun.id,
        stepRecordId: stepRecord?.id,
        stepDefinitionId: step.id,
        traceId,
        summary: result.summary,
        output: result.output,
        status: result.status,
      });

      if (result.status === "waiting_for_approval") {
        await WorkflowStateManager.transitionWorkflow({
          userId,
          workflowId,
          status: "waiting_for_approval",
          traceId,
          reason: result.summary,
        });
      }
    } catch (error) {
      const category = classifyFailure(error);
      const message = error instanceof Error ? error.message : "Step failed";
      const retryable = policy.retryableErrors.includes(category) && attempt < policy.maxAttempts;

      await WorkflowStateManager.failStep({
        userId,
        workflowId,
        agentRunId: agentRun.id,
        stepRecordId: stepRecord?.id,
        stepDefinitionId: step.id,
        traceId,
        error: message,
      });

      if (retryable) {
        const delayMs = computeBackoffMs(policy, attempt);
        await OrchestrationEventBus.publish(userId, {
          workflowId,
          agentRunId: agentRun.id,
          stepId: stepRecord?.id,
          type: "step.retrying",
          source: "workflow_executor",
          visibility: "user_visible",
          traceId,
          payload: { category, attempt, delayMs },
        });
        throw new Error(`RETRYABLE:${delayMs}:${message}`);
      }

      throw error;
    }
  }
}

export const workflowExecutor = new WorkflowExecutor();
