import { Job, Worker } from "bullmq";
import { createRedisConnection } from "@/lib/queue/connection";
import {
  enqueueWorkflowDlq,
  orchestrationQueueNames,
  workflowExecutor,
  workflowExecutionPayloadSchema,
  traceWorkflow,
} from "@/lib/orchestration";
import { logger } from "@/lib/logger";

const connection = createRedisConnection();

export const orchestrationWorker = new Worker(
  orchestrationQueueNames.workflow,
  async (job: Job) => {
    const payload = workflowExecutionPayloadSchema.parse(job.data);
    logger.info({ workflowId: payload.workflowId, jobId: job.id }, "[OrchestrationWorker] executing");

    try {
      return await traceWorkflow({
        workflowId: payload.workflowId,
        workflowType: "unknown",
        operation: "workflow.execute",
        fn: () => workflowExecutor.execute(payload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow execution failed";

      if (message.startsWith("RETRYABLE:")) {
        throw error;
      }

      await enqueueWorkflowDlq({
        ...payload,
        error: message,
      }).catch((dlqError) => {
        logger.error({ dlqError, workflowId: payload.workflowId }, "[OrchestrationWorker] DLQ enqueue failed");
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: Number(process.env.ORCHESTRATION_WORKER_CONCURRENCY ?? 5),
    autorun: true,
  }
);

orchestrationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "[OrchestrationWorker] completed");
});

orchestrationWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "[OrchestrationWorker] failed");
});

orchestrationWorker.on("error", (error) => {
  logger.error({ error }, "[OrchestrationWorker] runtime error");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "[OrchestrationWorker] shutting down");
  await orchestrationWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
