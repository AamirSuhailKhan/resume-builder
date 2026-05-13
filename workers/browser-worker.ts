import { Job, Worker } from "bullmq";
import { createRedisConnection } from "@/lib/queue/connection";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { BrowserExecutionStatus } from "@prisma/client";
import { BrowserSessionManager } from "@/lib/browser/session-manager";
import { BrowserExecutor } from "@/lib/browser/browser-executor";
import { BrowserExecutionStateMachine } from "@/lib/browser/execution-state";
import { browserContextPool } from "@/lib/browser/context-pool";
import os from "os";

const WORKER_ID = `browser-${os.hostname()}-${process.pid}`;
const HEARTBEAT_INTERVAL_MS = 10_000;

const connection = createRedisConnection();

export const browserWorker = new Worker(
  "browser-automation",
  async (job: Job) => {
    const { workflowId, userId, domain, steps } = job.data;

    logger.info({ workflowId, jobId: job.id }, "[BrowserWorker] starting execution");

    // Create execution record in queued state
    const execution = await prisma.browserExecution.create({
      data: { workflowId, userId, status: BrowserExecutionStatus.queued },
    });

    // Transition → booting
    await BrowserExecutionStateMachine.transition(execution.id, BrowserExecutionStatus.booting);

    // Heartbeat loop while this job runs
    const heartbeatTimer = setInterval(async () => {
      await BrowserExecutionStateMachine.heartbeat(execution.id);
    }, HEARTBEAT_INTERVAL_MS);

    let contextId: string | null = null;

    try {
      const storageState = await BrowserSessionManager.getSession(userId, domain);

      // Acquire context from pool (not a raw chromium.launch!)
      const { contextId: cid, context } = await browserContextPool.acquire({
        storageState: storageState ?? undefined,
      });
      contextId = cid;

      // Register the lease
      await prisma.browserLease.create({
        data: {
          executionId: execution.id,
          contextId: cid,
          status: "active",
        },
      });

      const page = await context.newPage();
      const executor = new BrowserExecutor(page, execution.id, workflowId, userId);

      // Transition → navigating
      await BrowserExecutionStateMachine.transition(execution.id, BrowserExecutionStatus.navigating);

      for (const step of steps) {
        switch (step.type) {
          case "browser.navigate":
            await executor.navigate(step.url);
            break;
          case "browser.click":
            await executor.click(step.selector);
            browserContextPool.recordAction(cid, true);
            break;
          case "browser.type":
            await executor.type(step.selector, step.value);
            browserContextPool.recordAction(cid, true);
            break;
          case "browser.screenshot":
            await executor.captureScreenshot();
            break;
        }
      }

      // Save refreshed auth session
      const newState = await context.storageState();
      await BrowserSessionManager.saveSession(userId, domain, newState);

      // Release lease
      await prisma.browserLease.updateMany({
        where: { executionId: execution.id, status: "active" },
        data: { status: "released", releasedAt: new Date() },
      });

      await browserContextPool.release(cid);
      contextId = null;

      await BrowserExecutionStateMachine.transition(execution.id, BrowserExecutionStatus.completed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error({ workflowId, err }, "[BrowserWorker] execution failed");

      if (contextId) {
        await browserContextPool.release(contextId).catch(() => null);
        await prisma.browserLease.updateMany({
          where: { executionId: execution.id, status: "active" },
          data: { status: "dead", releasedAt: new Date() },
        });
      }

      await BrowserExecutionStateMachine.transition(execution.id, BrowserExecutionStatus.failed, {
        metadata: { error: message },
      });

      throw err;
    } finally {
      clearInterval(heartbeatTimer);
    }
  },
  {
    connection,
    concurrency: 1,
    autorun: true,
  }
);

// Register this worker's heartbeat
async function registerWorkerHeartbeat() {
  await prisma.workerHeartbeat.upsert({
    where: { workerId: WORKER_ID },
    create: { workerId: WORKER_ID, workerType: "browser", hostname: os.hostname(), lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
}

setInterval(registerWorkerHeartbeat, HEARTBEAT_INTERVAL_MS);
registerWorkerHeartbeat().catch(console.error);
