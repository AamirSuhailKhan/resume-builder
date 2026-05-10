import { JobsOptions, Queue } from "bullmq";
import { getQueueRedisConnection } from "@/lib/queue/connection";
import { WorkflowExecutionPayload, workflowExecutionPayloadSchema } from "./types";

export const orchestrationQueueNames = {
  workflow: "career-os-workflow",
  workflowDlq: "career-os-workflow-dlq",
  browser: "career-os-browser",
  telemetry: "career-os-telemetry",
} as const;

const globalForOrchestrationQueues = globalThis as unknown as {
  orchestrationQueues?: Map<string, Queue>;
};

function getOrchestrationQueue(name: string) {
  if (!globalForOrchestrationQueues.orchestrationQueues) {
    globalForOrchestrationQueues.orchestrationQueues = new Map();
  }

  if (!globalForOrchestrationQueues.orchestrationQueues.has(name)) {
    globalForOrchestrationQueues.orchestrationQueues.set(
      name,
      new Queue(name, {
        connection: getQueueRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2_000 },
          removeOnComplete: { age: 86_400, count: 2_000 },
          removeOnFail: { age: 604_800, count: 10_000 },
        },
      })
    );
  }

  return globalForOrchestrationQueues.orchestrationQueues.get(name)!;
}

export async function enqueueWorkflowExecution(
  payload: WorkflowExecutionPayload,
  options: JobsOptions = {}
) {
  const parsed = workflowExecutionPayloadSchema.parse(payload);
  const queue = getOrchestrationQueue(orchestrationQueueNames.workflow);
  return queue.add("workflow.execute", parsed, {
    jobId: `workflow:${parsed.workflowId}:${parsed.stepId ?? "graph"}:${parsed.traceId ?? "new"}`,
    ...options,
  });
}

export async function enqueueWorkflowDlq(payload: WorkflowExecutionPayload & { error: string }) {
  const queue = getOrchestrationQueue(orchestrationQueueNames.workflowDlq);
  return queue.add("workflow.dead_letter", payload, {
    jobId: `workflow-dlq:${payload.workflowId}:${crypto.randomUUID()}`,
  });
}
