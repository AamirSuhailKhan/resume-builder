import { JobsOptions, Queue } from "bullmq";
import { prisma } from "@/lib/db/prisma";
import { getQueueRedisConnection } from "@/lib/queue/connection";
import {
  jobPayloadSchemas,
  queueName,
  ResumeAiJobName,
  ResumeAiJobPayloadMap,
} from "@/lib/queue/types";
import { QueueUnavailableError } from "@/lib/errors";

const globalForQueue = globalThis as unknown as {
  resumeAiQueue?: Queue;
};

function getResumeAiQueue() {
  if (!globalForQueue.resumeAiQueue) {
    globalForQueue.resumeAiQueue = new Queue(queueName, {
      connection: getQueueRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      },
    });
  }

  return globalForQueue.resumeAiQueue;
}

function defaultJobOptions(name: ResumeAiJobName, payload: ResumeAiJobPayloadMap[ResumeAiJobName]): JobsOptions {
  const resumeId = "resumeId" in payload && payload.resumeId ? payload.resumeId : "global";
  const jobRecordId = "jobRecordId" in payload ? payload.jobRecordId : crypto.randomUUID();
  return {
    jobId: `${name}:${resumeId}:${jobRecordId}`,
  };
}

export async function enqueueJob<TName extends ResumeAiJobName>(
  name: TName,
  payload: ResumeAiJobPayloadMap[TName],
  options: JobsOptions = {}
) {
  const parsed = jobPayloadSchemas[name].parse(payload) as ResumeAiJobPayloadMap[TName];
  let job;

  try {
    const queue = getResumeAiQueue();
    job = await queue.add(name, parsed, {
      ...defaultJobOptions(name, parsed),
      ...options,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue job.";
    console.error("[QUEUE] Failed to enqueue job", { name, jobRecordId: parsed.jobRecordId, error });
    await prisma.job.update({
      where: { id: parsed.jobRecordId },
      data: { status: "failed", lastError: message },
    }).catch((updateError) => {
      console.error("[QUEUE] Failed to mark job as failed", {
        jobRecordId: parsed.jobRecordId,
        error: updateError,
      });
    });

    throw new QueueUnavailableError(message);
  }

  await prisma.job.update({
    where: { id: parsed.jobRecordId },
    data: { bullJobId: String(job.id), status: "queued" },
  });

  return job;
}

export async function enqueueAutosave(payload: ResumeAiJobPayloadMap["autosave"]) {
  return enqueueJob("autosave", payload, {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
  });
}

export async function enqueueResumeAnalysis(payload: ResumeAiJobPayloadMap["ats_analysis"]) {
  return enqueueJob("ats_analysis", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
  });
}

export async function enqueueAiRewrite(payload: ResumeAiJobPayloadMap["ai_rewrite"]) {
  return enqueueJob("ai_rewrite", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueuePdfExport(payload: ResumeAiJobPayloadMap["export_pdf"]) {
  return enqueueJob("export_pdf", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueJobIntelligence(payload: ResumeAiJobPayloadMap["ai_job_intelligence"]) {
  return enqueueJob("ai_job_intelligence", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueAutoApply(payload: ResumeAiJobPayloadMap["ai_auto_apply"]) {
  return enqueueJob("ai_auto_apply", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueuePortfolio(payload: ResumeAiJobPayloadMap["ai_portfolio"]) {
  return enqueueJob("ai_portfolio", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}
