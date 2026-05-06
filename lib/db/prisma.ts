import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();

  const adapter = new PrismaPg({
    connectionString: url,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Singleton: reuse across hot-reloads in dev, reuse the single instance in prod
export const prisma = globalThis.__prisma ?? createPrismaClient();

// Always cache on globalThis so both dev HMR and prod keep one connection
globalThis.__prisma = prisma;
