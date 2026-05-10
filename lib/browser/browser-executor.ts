import { Page } from "playwright";
import { logger } from "@/lib/logger";
import { OrchestrationEventBus } from "@/lib/orchestration/events";
import { prisma } from "@/lib/db/prisma";

export class BrowserExecutor {
  constructor(
    private page: Page,
    private executionId: string,
    private workflowId: string,
    private userId: string
  ) {}

  async navigate(url: string) {
    logger.info({ executionId: this.executionId, url }, "[BrowserExecutor] navigating");
    await this.page.goto(url, { waitUntil: "networkidle" });
    await this.recordAction("navigate", url);
    await this.captureScreenshot();
  }

  async click(selector: string) {
    await this.page.waitForSelector(selector, { state: "visible", timeout: 10000 });
    await this.page.click(selector);
    await this.recordAction("click", selector);
    await this.captureScreenshot();
  }

  async type(selector: string, value: string) {
    await this.page.waitForSelector(selector, { state: "visible" });
    await this.page.fill(selector, "");
    await this.page.type(selector, value, { delay: 100 });
    await this.recordAction("type", selector, value);
  }

  async extract(selector: string) {
    const text = await this.page.innerText(selector);
    await this.recordAction("extract", selector, text);
    return text;
  }

  private async recordAction(type: string, selector?: string, value?: string) {
    const action = await prisma.dOMAction.create({
      data: {
        executionId: this.executionId,
        workflowId: this.workflowId,
        actionType: type,
        selector,
        value,
        url: this.page.url(),
        success: true
      }
    });

    await OrchestrationEventBus.publish(this.userId, {
      workflowId: this.workflowId,
      type: "tool.called",
      source: "browser-executor",
      payload: { 
        action: type, 
        selector, 
        value, 
        url: this.page.url(),
        actionId: action.id
      }
    });
  }

  async captureScreenshot() {
    try {
      const buffer = await this.page.screenshot({ type: "jpeg", quality: 60 });
      const base64 = buffer.toString("base64");
      
      const screenshot = await prisma.executionScreenshot.create({
        data: {
          executionId: this.executionId,
          workflowId: this.workflowId,
          url: this.page.url(),
          storageKey: `data:image/jpeg;base64,${base64}` // In prod, upload to S3/Supabase Storage
        }
      });

      await OrchestrationEventBus.publish(this.userId, {
        workflowId: this.workflowId,
        type: "workflow.updated" as any, // custom type for UI
        source: "browser-executor",
        payload: {
          type: "screenshot",
          id: screenshot.id,
          data: screenshot.storageKey,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      logger.error({ err }, "[BrowserExecutor] failed to capture screenshot");
    }
  }
}
