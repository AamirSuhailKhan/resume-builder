import "server-only";
import { Page } from "playwright";
import { logger } from "@/lib/logger";
import { OrchestrationEventBus } from "@/lib/orchestration/events";
import { prisma } from "@/lib/db/prisma";

/**
 * BrowserExecutor — wraps a live Playwright Page.
 *
 * Responsibilities:
 *  1. Execute DOM actions (navigate, click, type, extract)
 *  2. Persist each action to DOMAction for replay/audit
 *  3. Persist AI reasoning to ExecutionReasoning
 *  4. Capture JPEG screenshots and stream via OrchestrationEventBus
 *  5. Keep BrowserExecution.currentUrl / currentTitle in sync
 *
 * The frontend (ExecutionSurface + ExecutionIntelligence) visualizes
 * persisted state — it never touches Playwright directly.
 */
export class BrowserExecutor {
  constructor(
    private page: Page,
    private executionId: string,
    private workflowId: string,
    private userId: string
  ) {}

  // ── Navigation ─────────────────────────────────────────────────────────────

  async navigate(url: string) {
    logger.info({ executionId: this.executionId, url }, "[BrowserExecutor] navigating");
    await this.page.goto(url, { waitUntil: "networkidle" });
    await this.syncBrowserState();
    await this.recordAction("navigate", url);
    await this.captureScreenshot();
  }

  // ── DOM Actions ────────────────────────────────────────────────────────────

  async click(selector: string) {
    await this.page.waitForSelector(selector, { state: "visible", timeout: 10_000 });
    await this.page.click(selector);
    await this.recordAction("click", selector);
    await this.captureScreenshot();
  }

  async type(selector: string, value: string) {
    await this.page.waitForSelector(selector, { state: "visible" });
    await this.page.fill(selector, "");
    await this.page.type(selector, value, { delay: 80 });
    await this.recordAction("type", selector, value);
  }

  async extract(selector: string): Promise<string> {
    const text = await this.page.innerText(selector);
    await this.recordAction("extract", selector, text);
    return text;
  }

  async submit(selector: string) {
    await this.page.click(selector);
    await this.recordAction("submit", selector);
    await this.captureScreenshot();
  }

  // ── AI Reasoning ───────────────────────────────────────────────────────────

  /**
   * Call this BEFORE taking an action to explain the AI's decision.
   * Persists to ExecutionReasoning and streams an "agent.reasoning" event
   * so the Execution Viewer shows it in real time.
   */
  async reason(
    decision: string,
    reasoning: string,
    options?: { confidence?: number; alternatives?: unknown; context?: unknown }
  ) {
    logger.info({ executionId: this.executionId, decision }, "[BrowserExecutor] reasoning");

    const record = await prisma.executionReasoning.create({
      data: {
        executionId: this.executionId,
        workflowId: this.workflowId,
        decision,
        reasoning,
        confidence: options?.confidence ?? 0.85,
        alternatives: options?.alternatives as any ?? undefined,
        context: options?.context as any ?? undefined,
      },
    });

    await OrchestrationEventBus.publish(this.userId, {
      workflowId: this.workflowId,
      type: "agent.reasoning" as any,
      source: "browser-executor",
      payload: {
        id: record.id,
        decision,
        reasoning,
        confidence: record.confidence,
      },
    });
  }

  // ── Screenshot ─────────────────────────────────────────────────────────────

  async captureScreenshot() {
    try {
      const buffer = await this.page.screenshot({ type: "jpeg", quality: 65 });
      const base64 = buffer.toString("base64");

      const screenshot = await prisma.executionScreenshot.create({
        data: {
          executionId: this.executionId,
          workflowId: this.workflowId,
          url: this.page.url(),
          storageKey: `data:image/jpeg;base64,${base64}`,
          // TODO: in production, upload buffer to Supabase Storage and store the public URL instead
        },
      });

      await OrchestrationEventBus.publish(this.userId, {
        workflowId: this.workflowId,
        type: "workflow.updated" as any,
        source: "browser-executor",
        payload: {
          type: "screenshot",
          id: screenshot.id,
          data: screenshot.storageKey,
          url: screenshot.url,
          timestamp: screenshot.createdAt.toISOString(),
        },
      });
    } catch (err) {
      logger.error({ err }, "[BrowserExecutor] failed to capture screenshot");
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async recordAction(
    type: string,
    selector?: string,
    value?: string,
    success = true,
    errorMessage?: string
  ) {
    const action = await prisma.dOMAction.create({
      data: {
        executionId: this.executionId,
        workflowId: this.workflowId,
        actionType: type,
        selector: selector ?? null,
        value: value ?? null,
        url: this.page.url(),
        success,
        errorMessage: errorMessage ?? null,
      },
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
        actionId: action.id,
        success,
      },
    });
  }

  /**
   * Keeps BrowserExecution.currentUrl and currentTitle in sync after navigation.
   * This enables the SSR-hydrated ExecutionSurface to show a sensible initial URL.
   */
  private async syncBrowserState() {
    try {
      const url = this.page.url();
      const title = await this.page.title().catch(() => null);
      await prisma.browserExecution.updateMany({
        where: { id: this.executionId },
        data: { currentUrl: url, currentTitle: title ?? null },
      });
    } catch (err) {
      logger.warn({ err }, "[BrowserExecutor] failed to sync browser state");
    }
  }
}
