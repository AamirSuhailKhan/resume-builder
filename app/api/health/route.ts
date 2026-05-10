/**
 * GET /api/health
 *
 * Production-grade health endpoint.
 * Returns 200 OK with { status: "ok" } when all systems are nominal.
 * Returns 503 with structured error when DB or schema is degraded.
 *
 * Used by:
 * - Load balancers / uptime monitors
 * - Deployment readiness probes
 * - Dashboard banner checks
 */
import { NextResponse } from "next/server";
import { checkSchemaHealth } from "@/lib/db/schema-health";

const startedAt = Date.now();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const schemaHealth = await checkSchemaHealth();

  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  const body = {
    status: schemaHealth.healthy ? "ok" : "degraded",
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    schema: {
      healthy: schemaHealth.healthy,
      missingTables: schemaHealth.missingTables,
      checkedAt: schemaHealth.checkedAt,
    },
    version: process.env.npm_package_version ?? "0.1.0",
  };

  if (!schemaHealth.healthy) {
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body, { status: 200 });
}
