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
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditEvent.create({ data: params });
  } catch (err: any) {
    // Audit writing must never crash the caller
    logger.error({ err: err.message, action: params.action }, "[Audit] Failed to write event");
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
  payload?: Record<string, unknown>;
}) {
  try {
    await prisma.queueEvent.create({ data: params });
  } catch (err: any) {
    logger.error({ err: err.message }, "[Audit] Failed to write queue event");
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
        durationMs: params.durationMs,
        error: params.error,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "[Audit] Failed to write provider event");
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
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.aTSScoreHistory.create({ data: params });
  } catch (err: any) {
    logger.error({ err: err.message }, "[Audit] Failed to record ATS score");
  }
}
