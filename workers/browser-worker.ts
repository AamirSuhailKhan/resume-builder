import { Job, Worker } from "bullmq";
import { chromium } from "playwright";
import { createRedisConnection } from "@/lib/queue/connection";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { BrowserSessionManager } from "@/lib/browser/session-manager";
import { BrowserExecutor } from "@/lib/browser/browser-executor";

const connection = createRedisConnection();

export const browserWorker = new Worker(
  "browser-automation",
  async (job: Job) => {
    const { workflowId, userId, domain, steps } = job.data;
    
    logger.info({ workflowId, jobId: job.id }, "[BrowserWorker] starting execution");

    const execution = await prisma.browserExecution.create({
      data: {
        workflowId,
        userId,
        status: "running"
      }
    });

    const storageState = await BrowserSessionManager.getSession(userId, domain);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: storageState || undefined });
    const page = await context.newPage();

    const executor = new BrowserExecutor(page, execution.id, workflowId, userId);

    try {
      for (const step of steps) {
        switch (step.type) {
          case "browser.navigate":
            await executor.navigate(step.url);
            break;
          case "browser.click":
            await executor.click(step.selector);
            break;
          case "browser.type":
            await executor.type(step.selector, step.value);
            break;
          case "browser.screenshot":
            await executor.captureScreenshot();
            break;
          // Add more handlers as needed
        }
      }

      // Save session if updated
      const newState = await context.storageState();
      await BrowserSessionManager.saveSession(userId, domain, newState);

      await prisma.browserExecution.update({
        where: { id: execution.id },
        data: { status: "completed" }
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error({ workflowId, err }, "[BrowserWorker] execution failed");
      await prisma.browserExecution.update({
        where: { id: execution.id },
        data: { status: "failed", metadata: { error: message } }
      });
      throw err;
    } finally {
      await browser.close();
    }
  },
  {
    connection,
    concurrency: 1, // Start small
    autorun: true
  }
);
