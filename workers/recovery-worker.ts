/**
 * workers/recovery-worker.ts
 *
 * Crash Recovery & Worker Health Monitor
 *
 * Responsibilities:
 *  1. Detect stale BrowserExecution records (heartbeat expired → timed_out)
 *  2. Detect dead BrowserLease records and mark them as "dead"
 *  3. Detect stale WorkerHeartbeat records (worker process crashed)
 *  4. Periodically flush its own heartbeat so the system knows it's alive
 *
 * Run as a long-lived standalone process:
 *   tsx workers/recovery-worker.ts
 */

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import os from "os";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const WORKER_ID = `recovery-${os.hostname()}-${process.pid}`;
const WORKER_TYPE = "recovery";
const HEARTBEAT_INTERVAL_MS = 10_000;    // Update own heartbeat every 10s
const RECOVERY_INTERVAL_MS  = 60_000;   // Run recovery scan every 60s

/** Execution is considered dead if no heartbeat for this long */
const EXECUTION_HEARTBEAT_TIMEOUT_MS = 30_000;

/** Worker is considered dead if no heartbeat for this long */
const WORKER_HEARTBEAT_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Own heartbeat
// ---------------------------------------------------------------------------
async function updateOwnHeartbeat() {
  try {
    await prisma.workerHeartbeat.upsert({
      where: { workerId: WORKER_ID },
      create: {
        workerId: WORKER_ID,
        workerType: WORKER_TYPE,
        hostname: os.hostname(),
        lastSeenAt: new Date(),
        metadata: { pid: process.pid, started: new Date().toISOString() },
      },
      update: {
        lastSeenAt: new Date(),
        metadata: { pid: process.pid },
      },
    });
  } catch (err) {
    logger.warn({ err }, "[RecoveryWorker] Failed to update own heartbeat.");
  }
}

// ---------------------------------------------------------------------------
// Recovery: stale browser executions
// ---------------------------------------------------------------------------
async function recoverStaleExecutions() {
  const cutoff = new Date(Date.now() - EXECUTION_HEARTBEAT_TIMEOUT_MS);

  const stale = await prisma.browserExecution.findMany({
    where: {
      status: { notIn: ["completed", "failed", "canceled", "timed_out"] },
      OR: [
        { lastHeartbeatAt: { lt: cutoff } },
        { lastHeartbeatAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true, status: true, workflowId: true, userId: true },
  });

  if (stale.length === 0) return;

  logger.warn({ count: stale.length }, "[RecoveryWorker] Found stale executions — marking timed_out.");

  for (const execution of stale) {
    try {
      await prisma.browserExecution.update({
        where: { id: execution.id },
        data: {
          status: "timed_out",
          completedAt: new Date(),
          metadata: {
            recoveredAt: new Date().toISOString(),
            previousStatus: execution.status,
            recoveredBy: WORKER_ID,
          },
        },
      });

      // Also mark any active leases as dead
      await prisma.browserLease.updateMany({
        where: { executionId: execution.id, status: "active" },
        data: { status: "dead", releasedAt: new Date() },
      });

      logger.info(
        { executionId: execution.id, from: execution.status },
        "[RecoveryWorker] Execution marked timed_out."
      );
    } catch (err) {
      logger.error({ err, executionId: execution.id }, "[RecoveryWorker] Failed to recover execution.");
    }
  }
}

// ---------------------------------------------------------------------------
// Recovery: dead workers
// ---------------------------------------------------------------------------
async function detectDeadWorkers() {
  const cutoff = new Date(Date.now() - WORKER_HEARTBEAT_TIMEOUT_MS);

  const deadWorkers = await prisma.workerHeartbeat.findMany({
    where: { lastSeenAt: { lt: cutoff } },
    select: { workerId: true, workerType: true, hostname: true, lastSeenAt: true },
  });

  if (deadWorkers.length === 0) return;

  logger.warn(
    { count: deadWorkers.length, workers: deadWorkers.map((w) => w.workerId) },
    "[RecoveryWorker] Dead workers detected."
  );

  // For now: log dead workers. A future enhancement would trigger workflow
  // reassignment to a healthy worker.
}

// ---------------------------------------------------------------------------
// Recovery: orphaned leases
// ---------------------------------------------------------------------------
async function recoverOrphanedLeases() {
  const cutoff = new Date(Date.now() - EXECUTION_HEARTBEAT_TIMEOUT_MS * 2);

  const result = await prisma.browserLease.updateMany({
    where: {
      status: "active",
      leasedAt: { lt: cutoff },
      releasedAt: null,
    },
    data: { status: "dead", releasedAt: new Date() },
  });

  if (result.count > 0) {
    logger.warn({ count: result.count }, "[RecoveryWorker] Orphaned leases marked dead.");
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
async function runRecovery() {
  logger.info("[RecoveryWorker] Running recovery scan...");
  await Promise.allSettled([
    recoverStaleExecutions(),
    detectDeadWorkers(),
    recoverOrphanedLeases(),
  ]);
  logger.info("[RecoveryWorker] Recovery scan complete.");
}

async function main() {
  logger.info({ workerId: WORKER_ID }, "[RecoveryWorker] Starting...");

  // Initial state
  await updateOwnHeartbeat();
  await runRecovery();

  // Heartbeat timer
  const heartbeatTimer = setInterval(async () => {
    await updateOwnHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);

  // Recovery scan timer
  const recoveryTimer = setInterval(async () => {
    await runRecovery();
  }, RECOVERY_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "[RecoveryWorker] Shutting down...");
    clearInterval(heartbeatTimer);
    clearInterval(recoveryTimer);
    // Mark own heartbeat as gone so the system can detect this worker stopped
    await prisma.workerHeartbeat.deleteMany({ where: { workerId: WORKER_ID } }).catch(() => null);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "[RecoveryWorker] Fatal error.");
  process.exit(1);
});
