import { z } from "zod";
import {
  AgentRunStatus,
  ApprovalStatus,
  WorkflowStatus,
} from "@prisma/client";

export const workflowTypes = [
  "resume_optimization",
  "job_matching",
  "auto_apply",
  "recruiter_outreach",
  "interview_prep",
  "career_coaching",
] as const;

export const agentTypes = [
  "planner",
  "resume_optimizer",
  "job_matcher",
  "browser_apply",
  "recruiter_communicator",
  "follow_up",
  "interview_prep",
  "analytics",
  "career_coach",
] as const;

export const stepKinds = [
  "agent",
  "tool",
  "approval",
  "branch",
  "delay",
  "emit",
] as const;

export type WorkflowType = (typeof workflowTypes)[number];
export type AgentType = (typeof agentTypes)[number];
export type StepKind = (typeof stepKinds)[number];
export type JsonObject = Record<string, unknown>;

export type RetryPolicy = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  jitter: boolean;
  retryableErrors: WorkflowFailureCategory[];
};

export type WorkflowFailureCategory =
  | "transient_network"
  | "provider_rate_limit"
  | "model_overloaded"
  | "tool_timeout"
  | "browser_brittle"
  | "approval_expired"
  | "policy_blocked"
  | "invalid_input"
  | "security_violation"
  | "unknown";

export type WorkflowStepDefinition = {
  id: string;
  kind: StepKind;
  name: string;
  agentType?: AgentType | undefined;
  toolName?: string | undefined;
  dependsOn?: string[] | undefined;
  input?: JsonObject | undefined;
  approval?: ApprovalPolicy | undefined;
  retry?: Partial<RetryPolicy> | undefined;
  timeoutMs?: number | undefined;
  condition?: WorkflowCondition | undefined;
  onSuccess?: string[] | undefined;
  onFailure?: string[] | undefined;
};

export type WorkflowCondition = {
  path: string;
  operator: "exists" | "equals" | "not_equals" | "gte" | "lte" | "includes";
  value?: unknown;
};

export type WorkflowGraphDefinition = {
  type: WorkflowType;
  version: number;
  name: string;
  description: string;
  defaultRetry: RetryPolicy;
  steps: WorkflowStepDefinition[];
};

export type WorkflowExecutionInput = {
  userId: string;
  workflowId: string;
  requestedBy: "user" | "system" | "worker" | "approval";
  stepId?: string | undefined;
  traceId?: string | undefined;
  replay?: boolean | undefined;
};

export type AgentContext = {
  userId: string;
  workflowId: string;
  agentRunId: string;
  traceId: string;
  workflowType: WorkflowType;
  step: WorkflowStepDefinition;
  input: JsonObject;
  memory: RetrievedMemory[];
  budget: AgentBudget;
  tools: ToolRegistryView;
  emit: (event: WorkflowEventInput) => Promise<unknown>;
  requireApproval: (request: ApprovalRequestInput) => Promise<ApprovalPause>;
};

export type AgentBudget = {
  modelTier: "cheap" | "medium" | "premium";
  maxPromptTokens: number;
  maxCompletionTokens: number;
  maxCostUsd: number;
};

export type AgentResult<TOutput extends JsonObject = JsonObject> = {
  output: TOutput;
  summary: string;
  status?: Extract<AgentRunStatus, "completed" | "waiting_for_approval" | "failed"> | undefined;
  costUsd?: number | undefined;
  tokenUsage?: TokenUsage | undefined;
  approval?: ApprovalPause | undefined;
  nextStepIds?: string[] | undefined;
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ToolDefinition<TInput extends JsonObject = JsonObject, TOutput extends JsonObject = JsonObject> = {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  permissions: string[];
  timeoutMs?: number | undefined;
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>;
};

export type ToolCallResult = {
  toolName: string;
  output: JsonObject;
  durationMs: number;
};

export type ToolRegistryView = {
  list: () => Pick<ToolDefinition, "name" | "description" | "permissions">[];
  call: (name: string, input: JsonObject) => Promise<ToolCallResult>;
};

export type RetrievedMemory = {
  id: string;
  type: string;
  title: string;
  content: string;
  confidence: number;
  source: string;
  score: number;
  evidenceRef?: string | null | undefined;
};

export type MemoryRetrievalIntent =
  | "planning"
  | "resume"
  | "job_matching"
  | "auto_apply"
  | "recruiter_outreach"
  | "interview"
  | "coaching";

export type ApprovalPolicy = {
  type: string;
  title: string;
  summary: string;
  riskFlags?: JsonObject | undefined;
  payload?: JsonObject | undefined;
  required: boolean;
};

export type ApprovalRequestInput = {
  type: string;
  title: string;
  summary: string;
  payload: JsonObject;
  riskFlags?: JsonObject | undefined;
  expiresAt?: Date | null | undefined;
};

export type ApprovalPause = {
  approvalId: string;
  status: ApprovalStatus;
};

export type WorkflowEventVisibility = "internal" | "user_visible" | "sensitive";

export type WorkflowEventInput = {
  workflowId?: string | undefined;
  agentRunId?: string | undefined;
  stepId?: string | undefined;
  type: WorkflowEventType;
  source: string;
  visibility?: WorkflowEventVisibility | undefined;
  payload: JsonObject;
  traceId?: string | undefined;
};

export type WorkflowEventType =
  | "workflow.created"
  | "workflow.started"
  | "workflow.paused"
  | "workflow.resumed"
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.canceled"
  | "step.queued"
  | "step.started"
  | "step.completed"
  | "step.failed"
  | "step.retrying"
  | "agent.started"
  | "agent.completed"
  | "agent.failed"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "memory.retrieved"
  | "tool.called"
  | "cost.recorded";

export type StepExecutionDecision =
  | { action: "execute"; step: WorkflowStepDefinition }
  | { action: "wait"; reason: string }
  | { action: "complete"; reason: string }
  | { action: "fail"; reason: string };

export type WorkflowRuntimeState = {
  workflowId: string;
  userId: string;
  type: WorkflowType;
  status: WorkflowStatus;
  completedStepIds: Set<string>;
  failedStepIds: Set<string>;
  activeStepIds: Set<string>;
};

export const workflowExecutionPayloadSchema = z.object({
  userId: z.string().uuid(),
  workflowId: z.string().uuid(),
  requestedBy: z.enum(["user", "system", "worker", "approval"]),
  stepId: z.string().optional(),
  traceId: z.string().optional(),
  replay: z.boolean().optional(),
});

export type WorkflowExecutionPayload = z.infer<typeof workflowExecutionPayloadSchema>;
