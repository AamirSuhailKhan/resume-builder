import { Job, Worker } from "bullmq";
import { prisma } from "@/lib/db/prisma";
import { createRedisConnection } from "@/lib/queue/connection";
import {
  jobPayloadSchemas,
  queueName,
  ResumeAiJobName,
  ResumeAiJobPayload,
} from "@/lib/queue/types";
import { logger } from "@/lib/logger";
import { handleAutosave } from "@/workers/handlers/autosave";
import { handleAtsAnalysis } from "@/workers/handlers/atsAnalysis";
import { handleAiRewrite } from "@/workers/handlers/aiRewrite";
import { handleExportPdf } from "@/workers/handlers/exportPdf";
import { handleAutoApply, handleJobIntelligence, handlePortfolio } from "@/workers/handlers/aiPlatform";

const handlers = {
  autosave: handleAutosave,
  ats_analysis: handleAtsAnalysis,
  ai_rewrite: handleAiRewrite,
  export_pdf: handleExportPdf,
  ai_job_intelligence: handleJobIntelligence,
  ai_auto_apply: handleAutoApply,
  ai_portfolio: handlePortfolio,
} satisfies Record<ResumeAiJobName, (payload: never) => Promise<unknown>>;

async function processJob(job: Job<ResumeAiJobPayload, unknown, ResumeAiJobName>) {
  const schema = jobPayloadSchemas[job.name];
  const payload = schema.parse(job.data);
  logger.info({ jobId: job.id, type: job.name }, "[Worker] processing job");

  try {
    const result = await handlers[job.name](payload as never);
    logger.info({ jobId: job.id, type: job.name }, "[Worker] completed job");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker job failed";
    await prisma.job.update({
      where: { id: payload.jobRecordId },
      data: { status: "failed", lastError: message, attempts: { increment: 1 } },
    }).catch(() => undefined);
    logger.error({ jobId: job.id, type: job.name, error }, "[Worker] failed job");
    throw error;
  }
}

let worker: Worker<ResumeAiJobPayload, unknown, ResumeAiJobName>;

try {
  worker = new Worker<ResumeAiJobPayload, unknown, ResumeAiJobName>(
    queueName,
    processJob,
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
      autorun: true,
      limiter: {
        max: Number(process.env.WORKER_RATE_LIMIT_MAX ?? 100),
        duration: Number(process.env.WORKER_RATE_LIMIT_DURATION_MS ?? 1000),
      },
    }
  );
} catch (error) {
  logger.error({ error }, "[Worker] failed to start. Check REDIS_URL.");
  void prisma.$disconnect();
  process.exit(1);
}

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, type: job.name }, "[Worker] completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, type: job?.name, error }, "[Worker] failed");
});

worker.on("error", (error) => {
  logger.error({ error }, "[Worker] runtime error");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "[Worker] shutting down");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
