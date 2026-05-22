import "server-only";
import { chromium } from "playwright";
import { getQueueRedisConnection } from "@/lib/queue/connection";
import { logger } from "@/lib/logger";

export type CrawlSourcePolicy = {
  sourceName: string;
  allowedDomains: string[];
  minDelayMs: number;
  maxPages: number;
  respectRobotsHint?: boolean;
};

export type CrawlPageResult = {
  url: string;
  title: string;
  text: string;
  screenshot?: Buffer;
};

function hostname(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function allowed(url: string, policy: CrawlSourcePolicy) {
  const host = hostname(url);
  return policy.allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export class EthicalInterviewCrawler {
  constructor(private readonly policy: CrawlSourcePolicy) {}

  async crawl(urls: string[]): Promise<CrawlPageResult[]> {
    const safeUrls = urls.filter((url) => allowed(url, this.policy)).slice(0, this.policy.maxPages);
    if (safeUrls.length === 0) return [];

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent: "CareerOSInterviewIntelBot/1.0 (+contact: support@careeros.local)",
    });

    const results: CrawlPageResult[] = [];
    try {
      for (const url of safeUrls) {
        await this.rateLimit(url);
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const title = await page.title();
          const text = await page.locator("body").innerText({ timeout: 10_000 });
          results.push({ url, title, text: text.slice(0, 100_000) });
        } catch (error) {
          logger.warn({ url, error }, "[InterviewCrawler] page skipped");
        }
      }
    } finally {
      await browser.close();
    }

    return results;
  }

  private async rateLimit(url: string) {
    const redis = getQueueRedisConnection();
    const key = `crawler:last:${this.policy.sourceName}:${hostname(url)}`;
    const last = await redis.get(key).catch(() => null);
    const now = Date.now();
    if (last) {
      const elapsed = now - Number(last);
      const waitMs = this.policy.minDelayMs - elapsed;
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    await redis.set(key, String(Date.now()), "EX", 3600).catch(() => undefined);
  }
}

export const INTERVIEW_SOURCE_POLICIES: Record<string, CrawlSourcePolicy> = {
  github: {
    sourceName: "github",
    allowedDomains: ["github.com", "raw.githubusercontent.com"],
    minDelayMs: 2_000,
    maxPages: 20,
  },
  geeksforgeeks: {
    sourceName: "geeksforgeeks",
    allowedDomains: ["geeksforgeeks.org"],
    minDelayMs: 8_000,
    maxPages: 5,
    respectRobotsHint: true,
  },
  reddit: {
    sourceName: "reddit",
    allowedDomains: ["reddit.com"],
    minDelayMs: 10_000,
    maxPages: 5,
    respectRobotsHint: true,
  },
};
