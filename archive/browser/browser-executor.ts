import "server-only";
import { BrowserExecutionStatus } from "@prisma/client";
import type { Page } from "playwright";
import { logger } from "@/lib/logger";
import { OrchestrationEventBus } from "@/lib/orchestration/events";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabaseServer";

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
    const captchaType = await this.detectCaptcha();
    if (captchaType !== "none") {
      const captchaResult = await this.handleCaptcha(captchaType, this.workflowId);
      if (captchaResult === "needs_human") {
        throw new Error(`${captchaType} CAPTCHA detected; human approval requested.`);
      }
    }
    await this.syncBrowserState();
    await this.recordAction("navigate", url);
    await this.captureScreenshot();
  }

  // ── DOM Actions ────────────────────────────────────────────────────────────

  async clickHuman(selector: string): Promise<void> {
    const el = await this.page.waitForSelector(selector, { state: "visible", timeout: 10_000 });
    const box = await el.boundingBox();
    if (!box) throw new Error("Element not in viewport");

    const x = box.x + box.width * (0.3 + Math.random() * 0.4);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);
    await this.page.mouse.move(x - 30 + Math.random() * 60, y - 20 + Math.random() * 40, { steps: 5 });
    await this.delay(80 + Math.random() * 180);
    await this.page.mouse.move(x, y, { steps: 3 });
    await this.delay(40 + Math.random() * 80);
    await this.page.mouse.click(x, y);
    await this.recordAction("click_human", selector);
    await this.captureScreenshot();
  }

  async typeHuman(selector: string, value: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: "visible", timeout: 10_000 });
    await this.page.click(selector);
    await this.delay(300 + Math.random() * 700);
    for (const char of value) {
      await this.page.keyboard.type(char);
      await this.delay(50 + Math.random() * 150);
      if (Math.random() < 0.02) await this.delay(500 + Math.random() * 800);
    }
    await this.recordAction("type_human", selector, value.slice(0, 50));
  }

  async extract(selector: string): Promise<string> {
    const text = await this.page.innerText(selector);
    await this.recordAction("extract", selector, text);
    return text;
  }

  async submit(selector: string) {
    await this.clickHuman(selector);
    await this.recordAction("submit", selector);
    await this.captureScreenshot();
  }

  async detectCaptcha(): Promise<"none" | "recaptcha" | "hcaptcha" | "cloudflare"> {
    const html = await this.page.content();
    if (html.includes("hcaptcha.com")) return "hcaptcha";
    if (html.includes("cf-challenge") || html.includes("cf_chl_")) return "cloudflare";
    const rcFrame = await this.page.$('iframe[src*="recaptcha"]');
    if (rcFrame || html.includes("data-sitekey")) return "recaptcha";
    return "none";
  }

  async handleCaptcha(type: string, workflowId: string): Promise<"solved" | "needs_human"> {
    if (type === "cloudflare") {
      await this.delay(5000 + Math.random() * 1000);
      const stillHasCaptcha = await this.detectCaptcha();
      if (stillHasCaptcha === "none") return "solved";
    }

    const screenshotBuffer = await this.page.screenshot({ type: "png" });
    const key = `screenshots/captcha-${crypto.randomUUID()}.png`;

    try {
      const supabase = await createClient();
      const { error } = await supabase.storage.from("screenshots").upload(key, screenshotBuffer, {
        contentType: "image/png",
        upsert: false,
      });
      if (error) throw error;
    } catch (err) {
      logger.warn({ err }, "[BrowserExecutor] request Supabase client failed for CAPTCHA screenshot; using admin client");
      const { error } = await supabaseAdmin.storage.from("screenshots").upload(key, screenshotBuffer, {
        contentType: "image/png",
        upsert: false,
      });
      if (error) logger.warn({ err: error }, "[BrowserExecutor] Failed to upload CAPTCHA screenshot");
    }

    await prisma.approvalRequest.create({
      data: {
        userId: this.userId,
        workflowId,
        type: "captcha_challenge",
        status: "pending",
        title: `${type} CAPTCHA detected`,
        summary: "The agent hit a CAPTCHA and paused. Solve it in the browser preview and click Resume.",
        payload: { screenshotKey: key, captchaType: type, currentUrl: this.page.url() },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await prisma.browserExecution.updateMany({
      where: { id: this.executionId },
      data: { status: BrowserExecutionStatus.captcha_required },
    });

    return "needs_human";
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
      const filename = `${this.executionId}/${Date.now()}.jpg`;

      // Upload to Supabase Storage (assuming an "executions" bucket exists)
      const { error: uploadError } = await supabaseAdmin.storage
        .from("executions")
        .upload(filename, buffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        logger.warn({ err: uploadError }, "[BrowserExecutor] Failed to upload screenshot to Supabase");
        // Fallback to base64 if upload fails so the UI doesn't break
      }

      // Generate public URL (or fallback to base64 if upload failed)
      let storageKey: string;
      if (!uploadError) {
        const { data } = supabaseAdmin.storage.from("executions").getPublicUrl(filename);
        storageKey = data.publicUrl;
      } else {
        const base64 = buffer.toString("base64");
        storageKey = `data:image/jpeg;base64,${base64}`;
      }

      const screenshot = await prisma.executionScreenshot.create({
        data: {
          executionId: this.executionId,
          workflowId: this.workflowId,
          url: this.page.url(),
          storageKey,
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

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
