import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { logger } from "@/lib/logger";
import { chromium } from "playwright-extra";
import StealthPlugin from "playwright-extra-plugin-stealth";
import type { Browser, BrowserContext, BrowserContextOptions } from "playwright";

chromium.use(StealthPlugin());

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export class BrowserSessionManager {
  static async getSession(userId: string, domain: string) {
    try {
      const session = await prisma.browserSession.findUnique({
        where: { userId_domain: { userId, domain } }
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return JSON.parse(decrypt(session.storageState as string));
    } catch (err) {
      logger.error({ userId, domain, err }, "[BrowserSessionManager] failed to get session");
      return null;
    }
  }

  static async saveSession(userId: string, domain: string, storageState: unknown) {
    try {
      const encryptedState = encrypt(JSON.stringify(storageState));
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days persistence

      await prisma.browserSession.upsert({
        where: { userId_domain: { userId, domain } },
        create: {
          userId,
          domain,
          storageState: encryptedState,
          expiresAt
        },
        update: {
          storageState: encryptedState,
          expiresAt,
          updatedAt: new Date()
        }
      });
    } catch (err) {
      logger.error({ userId, domain, err }, "[BrowserSessionManager] failed to save session");
    }
  }

  static async launchBrowser(): Promise<Browser> {
    await writeBrowserAudit("browser.stealth_launch", {
      headless: true,
      stealth: true,
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });

    return chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        `--user-agent=${USER_AGENT}`,
      ],
    });
  }

  static async createContext(
    browser: Browser,
    storageState?: BrowserContextOptions["storageState"]
  ): Promise<BrowserContext> {
    return browser.newContext({
      ...(storageState !== undefined ? { storageState } : {}),
      viewport: { width: 1366, height: 768 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
      userAgent: USER_AGENT,
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
      },
      geolocation: { latitude: 28.6139, longitude: 77.209 },
      permissions: ["geolocation"],
    });
  }
}

async function writeBrowserAudit(action: string, metadata: Record<string, unknown>) {
  try {
    const { writeAuditEvent } = await import("@/lib/domain/audit/audit.service");
    await writeAuditEvent({
      action,
      entityType: "BrowserSession",
      metadata: metadata as Prisma.InputJsonObject,
    });
  } catch (err) {
    logger.warn({ err, action }, "[BrowserSessionManager] audit write failed");
  }
}
