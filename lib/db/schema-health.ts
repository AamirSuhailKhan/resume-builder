/**
 * schema-health.ts
 *
 * Lightweight canary probe that verifies critical tables exist at runtime.
 * Used by /api/health, /api/schema-status, and SSR guards.
 * Returns a structured result — never throws.
 */
import { prisma } from "@/lib/db/prisma";

export interface SchemaHealthResult {
  healthy: boolean;
  missingTables: string[];
  checkedAt: string;
  errorCode?: string;
  errorMessage?: string;
}

// Canary queries: one cheap COUNT(*) per critical table.
// If a table is missing, Prisma throws P2021.
const CANARY_PROBES: Array<{ table: string; probe: () => Promise<unknown> }> = [
  { table: "User", probe: () => prisma.user.count() },
  { table: "Resume", probe: () => prisma.resume.count() },
  { table: "AIUsage", probe: () => prisma.aIUsage.count() },
  { table: "Application", probe: () => prisma.application.count() },
  { table: "JobOpportunity", probe: () => prisma.jobOpportunity.count() },
  { table: "CareerProfile", probe: () => prisma.careerProfile.count() },
  { table: "CareerMemory", probe: () => prisma.careerMemory.count() },
];

// P2021: The table `{table}` does not exist in the current database.
function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2021"
  );
}

let cachedResult: SchemaHealthResult | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // re-check every 30s

export async function checkSchemaHealth(force = false): Promise<SchemaHealthResult> {
  const now = Date.now();
  if (!force && cachedResult && now < cacheExpiry) {
    return cachedResult;
  }

  const missingTables: string[] = [];
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  await Promise.all(
    CANARY_PROBES.map(async ({ table, probe }) => {
      try {
        await probe();
      } catch (err: unknown) {
        if (isMissingTableError(err)) {
          missingTables.push(table);
        } else {
          // Non-schema error (connection refused, auth failure, etc.)
          const e = err as { code?: string; message?: string };
          errorCode = e.code;
          errorMessage = e.message;
        }
      }
    })
  );

  const result: SchemaHealthResult = {
    healthy: missingTables.length === 0 && !errorMessage,
    missingTables,
    checkedAt: new Date().toISOString(),
  };

  if (errorCode !== undefined) result.errorCode = errorCode;
  if (errorMessage !== undefined) result.errorMessage = errorMessage;

  cachedResult = result;
  cacheExpiry = now + CACHE_TTL_MS;
  return result;
}

export function invalidateSchemaHealthCache(): void {
  cachedResult = null;
  cacheExpiry = 0;
}

/**
 * Utility guard for SSR Server Components.
 * Usage:
 *   const { degraded } = await assertSchemaReady();
 *   if (degraded) return <SchemaDegradedBanner />;
 */
export async function assertSchemaReady(): Promise<{
  degraded: boolean;
  health: SchemaHealthResult;
}> {
  const health = await checkSchemaHealth();
  return { degraded: !health.healthy, health };
}
