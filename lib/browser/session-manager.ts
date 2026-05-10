import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/security/encryption";
import { logger } from "@/lib/logger";

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

  static async saveSession(userId: string, domain: string, storageState: any) {
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
}
