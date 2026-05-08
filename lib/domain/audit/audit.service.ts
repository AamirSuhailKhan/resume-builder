import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

/**
 * Centralized audit event writer.
 * Call this anywhere — it is fire-and-forget safe.
 */
export async function writeAuditEvent(params: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonObject;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditEvent.create({ data: params });
  } catch (err: unknown) {
    // Audit writing must never crash the caller
    const message = err instanceof Error ? err.message : "Unknown audit write error";
    logger.error({ err: message, action: params.action }, "[Audit] Failed to write event");
  }
}

/**
 * Write a queue lifecycle event for observability.
 */
export async function writeQueueEvent(params: {
  bullJobId: string;
  queue: string;
  jobType: string;
  status: string;
  userId?: string;
  durationMs?: number;
  error?: string;
  payload?: Prisma.InputJsonObject;
}) {
  try {
    await prisma.queueEvent.create({ data: params });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown queue audit write error";
    logger.error({ err: message }, "[Audit] Failed to write queue event");
  }
}

/**
 * Write a provider ingestion event.
 */
export async function writeProviderEvent(params: {
  provider: string;
  success: boolean;
  jobsFetched?: number;
  jobsInserted?: number;
  jobsSkipped?: number;
  durationMs?: number;
  error?: string;
}) {
  try {
    await prisma.providerEvent.create({
      data: {
        provider: params.provider,
        success: params.success,
        jobsFetched: params.jobsFetched ?? 0,
        jobsInserted: params.jobsInserted ?? 0,
        jobsSkipped: params.jobsSkipped ?? 0,
        durationMs: params.durationMs ?? null,
        error: params.error ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown provider audit write error";
    logger.error({ err: message }, "[Audit] Failed to write provider event");
  }
}

/**
 * Record an ATS score data point for historical tracking.
 */
export async function recordAtsScore(params: {
  userId: string;
  resumeId: string;
  score: number;
  jobTitle?: string;
  metadata?: Prisma.InputJsonObject;
}) {
  try {
    await prisma.aTSScoreHistory.create({ data: params });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown ATS score audit write error";
    logger.error({ err: message }, "[Audit] Failed to record ATS score");
  }
}
