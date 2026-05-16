import { Job, Worker } from "bullmq";
import { prisma } from "@/lib/db/prisma";
import { createRedisConnection } from "@/lib/queue/connection";
import {
  jobPayloadSchemas,
  queueNames,
  ResumeAiJobName,
  ResumeAiJobPayload,
} from "@/lib/queue/types";
import { logger } from "@/lib/logger";
import { handleAutosave } from "@/workers/handlers/autosave";
import { handleAtsAnalysis } from "@/workers/handlers/atsAnalysis";
import { handleAiRewrite } from "@/workers/handlers/aiRewrite";
import { handleExportPdf } from "@/workers/handlers/exportPdf";
import { handleAutoApply, handleJobIntelligence, handlePortfolio } from "@/workers/handlers/aiPlatform";
import { handleEmailDrip } from "@/workers/handlers/emailDrip";
import { handleComputeAnalytics } from "@/workers/handlers/computeAnalytics";

const handlers = {
  autosave: handleAutosave,
  ats_analysis: handleAtsAnalysis,
  ai_rewrite: handleAiRewrite,
  export_pdf: handleExportPdf,
  ai_job_intelligence: handleJobIntelligence,
  ai_auto_apply: handleAutoApply,
  ai_portfolio: handlePortfolio,
  email_drip: handleEmailDrip,
  compute_analytics: handleComputeAnalytics,
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

const workers: Worker<ResumeAiJobPayload, unknown, ResumeAiJobName>[] = [];

try {
  const connection = createRedisConnection();
  
  // Mapping jobs to their specific queue for separated architecture
  const jobToQueueMap: Record<ResumeAiJobName, string> = {
    autosave: queueNames.default,
    ats_analysis: queueNames.atsAnalysis,
    ai_rewrite: queueNames.atsAnalysis,
    export_pdf: queueNames.default,
    ai_job_intelligence: queueNames.atsAnalysis,
    ai_auto_apply: queueNames.atsAnalysis,
    ai_portfolio: queueNames.atsAnalysis,
    email_drip: queueNames.email,
    compute_analytics: queueNames.analytics,
  };

  const uniqueQueues = Array.from(new Set(Object.values(jobToQueueMap)));

  for (const qName of uniqueQueues) {
    const worker = new Worker<ResumeAiJobPayload, unknown, ResumeAiJobName>(
      qName,
      processJob,
      {
        connection,
        concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
        autorun: true,
      }
    );
    
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id, type: job.name, queue: qName }, "[Worker] completed");
    });

    worker.on("failed", (job, error) => {
      logger.error({ jobId: job?.id, type: job?.name, error, queue: qName }, "[Worker] failed");
    });

    worker.on("error", (error) => {
      logger.error({ error, queue: qName }, "[Worker] runtime error");
    });
    
    workers.push(worker);
  }
} catch (error) {
  logger.error({ error }, "[Worker] failed to start. Check REDIS_URL.");
  void prisma.$disconnect();
  process.exit(1);
}

async function shutdown(signal: string) {
  logger.info({ signal }, "[Worker] shutting down");
  await Promise.all(workers.map(w => w.close()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
