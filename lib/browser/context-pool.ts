import { chromium } from "playwright-extra";
import StealthPlugin from "playwright-extra-plugin-stealth";
import type { Browser, BrowserContext } from "playwright";
import { logger } from "@/lib/logger";

chromium.use(StealthPlugin());

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------
export interface ContextPoolOptions {
  /** Maximum simultaneous leased contexts (default: 5) */
  maxConcurrent?: number;
  /** Recycle a context after this many actions (default: 100) */
  maxActionsPerContext?: number;
  /** Force-recycle a context this many ms after creation (default: 15 min) */
  maxLifetimeMs?: number;
  /** Recycle after this many consecutive failures (default: 3) */
  maxFailures?: number;
}

interface PooledContext {
  id: string;
  context: BrowserContext;
  actions: number;
  failures: number;
  createdAt: number;
  leased: boolean;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// BrowserContextPool
// ---------------------------------------------------------------------------
export class BrowserContextPool {
  private browser: Browser | null = null;
  private pool = new Map<string, PooledContext>();
  private readonly opts: Required<ContextPoolOptions>;

  constructor(opts: ContextPoolOptions = {}) {
    this.opts = {
      maxConcurrent: opts.maxConcurrent ?? 5,
      maxActionsPerContext: opts.maxActionsPerContext ?? 100,
      maxLifetimeMs: opts.maxLifetimeMs ?? 15 * 60 * 1000,
      maxFailures: opts.maxFailures ?? 3,
    };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.browser) return;
    logger.info("[ContextPool] Launching browser...");
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        `--user-agent=${USER_AGENT}`,
      ],
    });
    logger.info("[ContextPool] Browser ready.");
  }

  async shutdown(): Promise<void> {
    logger.info("[ContextPool] Shutting down pool...");
    for (const entry of this.pool.values()) {
      await this._destroyContext(entry).catch(() => null);
    }
    this.pool.clear();
    await this.browser?.close().catch(() => null);
    this.browser = null;
    logger.info("[ContextPool] Pool shut down.");
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Lease a browser context for exclusive use.
   * Pass a Playwright storageState to restore an authenticated session.
   */
  async acquire(opts?: {
    storageState?: import("playwright").BrowserContextOptions["storageState"];
  }): Promise<{ contextId: string; context: BrowserContext }> {
    await this.init();

    const leasedCount = [...this.pool.values()].filter((e) => e.leased).length;
    if (leasedCount >= this.opts.maxConcurrent) {
      throw new Error(
        `[ContextPool] Max concurrent contexts reached (${this.opts.maxConcurrent}). Try again later.`
      );
    }

    const context = await this.browser!.newContext({
      ...(opts?.storageState ? { storageState: opts.storageState } : {}),
      viewport: { width: 1366, height: 768 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
      userAgent: USER_AGENT,
      extraHTTPHeaders: { "Accept-Language": "en-IN,en;q=0.9" },
      geolocation: { latitude: 28.6139, longitude: 77.209 },
      permissions: ["geolocation"],
    });

    const contextId = crypto.randomUUID();
    const entry: PooledContext = {
      id: contextId,
      context,
      actions: 0,
      failures: 0,
      createdAt: Date.now(),
      leased: true,
    };
    this.pool.set(contextId, entry);

    logger.info({ contextId, poolSize: this.pool.size }, "[ContextPool] Context leased.");
    return { contextId, context };
  }

  /**
   * Record a completed action on a context.
   * Automatically triggers recycling if limits are exceeded.
   */
  recordAction(contextId: string, success: boolean): void {
    const entry = this.pool.get(contextId);
    if (!entry) return;
    entry.actions++;
    if (!success) entry.failures++;

    if (this._shouldRecycle(entry)) {
      logger.warn({ contextId, actions: entry.actions, failures: entry.failures }, "[ContextPool] Context hit recycle threshold.");
      this._scheduleRecycle(contextId);
    }
  }

  /**
   * Return a context to the pool after use.
   * If recycling is needed, it's destroyed immediately.
   */
  async release(contextId: string): Promise<void> {
    const entry = this.pool.get(contextId);
    if (!entry) return;
    entry.leased = false;
    logger.info({ contextId }, "[ContextPool] Context released.");

    if (this._shouldRecycle(entry)) {
      await this.recycle(contextId);
    }
  }

  /**
   * Force-destroy a specific context and remove it from the pool.
   */
  async destroy(contextId: string): Promise<void> {
    const entry = this.pool.get(contextId);
    if (!entry) return;
    await this._destroyContext(entry);
    this.pool.delete(contextId);
    logger.info({ contextId }, "[ContextPool] Context destroyed.");
  }

  /**
   * Recycle a context — destroy it and remove from pool.
   * The caller should call acquire() again for a fresh context.
   */
  async recycle(contextId: string): Promise<void> {
    logger.info({ contextId }, "[ContextPool] Recycling context...");
    await this.destroy(contextId);
  }

  /**
   * Run the health-check loop — call this on a timer.
   * Destroys contexts that have exceeded maxLifetimeMs.
   */
  async runHealthCheck(): Promise<void> {
    const now = Date.now();
    for (const [id, entry] of this.pool.entries()) {
      if (!entry.leased && now - entry.createdAt > this.opts.maxLifetimeMs) {
        logger.warn({ contextId: id }, "[ContextPool] Context expired by age — recycling.");
        await this.recycle(id).catch(() => null);
      }
    }
  }

  get stats() {
    const entries = [...this.pool.values()];
    return {
      total: entries.length,
      leased: entries.filter((e) => e.leased).length,
      idle: entries.filter((e) => !e.leased).length,
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private _shouldRecycle(entry: PooledContext): boolean {
    return (
      entry.actions >= this.opts.maxActionsPerContext ||
      entry.failures >= this.opts.maxFailures ||
      Date.now() - entry.createdAt >= this.opts.maxLifetimeMs
    );
  }

  private _scheduleRecycle(contextId: string) {
    // Non-blocking — don't await in recordAction()
    this.recycle(contextId).catch((err) =>
      logger.error({ contextId, err }, "[ContextPool] Recycle failed.")
    );
  }

  private async _destroyContext(entry: PooledContext): Promise<void> {
    try {
      await entry.context.close();
    } catch (err) {
      logger.warn({ contextId: entry.id, err }, "[ContextPool] Error closing context.");
    }
  }
}

// Singleton instance for the browser worker process
export const browserContextPool = new BrowserContextPool({
  maxConcurrent: 5,
  maxActionsPerContext: 100,
  maxLifetimeMs: 15 * 60 * 1000, // 15 min
  maxFailures: 3,
});
