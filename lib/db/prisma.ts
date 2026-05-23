import "server-only";
import { PrismaClient } from "@prisma/client";

// Safe database URL diagnostics
const rawDbUrl = process.env.DATABASE_URL || "";
let dbProtocol = "UNKNOWN";

try {
  if (rawDbUrl) {
    const urlObj = new URL(rawDbUrl.startsWith("postgresql://") || rawDbUrl.startsWith("postgres://") ? rawDbUrl : "http://localhost");
    dbProtocol = urlObj.protocol.replace(":", "");
  }
} catch {
  // If parsing fails, extract prefix manually
  const match = rawDbUrl.match(/^[^:]+/);
  if (match) dbProtocol = match[0];
}

console.log(`[PRISMA DIAGNOSTICS] Active Database Protocol: ${dbProtocol}`);

if (dbProtocol === "prisma" || dbProtocol === "prisma+postgres") {
  console.error(
    `[PRISMA ERROR] Stale/Contaminated database protocol detected: "${dbProtocol}://". ` +
    `Expected standard "postgresql://" or "postgres://" connection URL.`
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "stdout", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" }
          ]
        : [
            { emit: "stdout", level: "error" }
          ],
  });

// Bind log events in development for engine initialization tracing
if (process.env.NODE_ENV === "development") {
  (prisma as any).$on("query", (e: any) => {
    // console.log(`[PRISMA QUERY] ${e.query}`);
  });
  (prisma as any).$on("error", (e: any) => {
    console.error(`[PRISMA ENGINE ERROR]`, e);
  });
  (prisma as any).$on("warn", (e: any) => {
    console.warn(`[PRISMA ENGINE WARNING]`, e);
  });
}

// Attempt simple connection validation on module load in background
prisma.$connect()
  .then(() => {
    console.log("[PRISMA DIAGNOSTICS] Connection successfully verified.");
  })
  .catch((err) => {
    console.error(
      `[PRISMA DIAGNOSTICS FAILURE] Connection failed. ` +
      `Ensure DATABASE_URL is correct and has not been contaminated by Prisma Accelerate/Data Proxy configuration. ` +
      `Error details:`, err
    );
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

