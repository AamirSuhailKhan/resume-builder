/**
 * GET /api/schema-status
 *
 * Returns detailed schema health for the dashboard warning banner.
 * Tells the frontend exactly which tables are missing and what commands to run.
 */
import { NextResponse } from "next/server";
import { checkSchemaHealth } from "@/lib/db/schema-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkSchemaHealth();

  const body = {
    healthy: health.healthy,
    missingTables: health.missingTables,
    checkedAt: health.checkedAt,
    ...(health.healthy
      ? {}
      : {
          action: {
            command: "npx prisma migrate reset --force",
            description:
              "Your database schema is out of sync with the Prisma migration history. Run this command to reset and reapply all migrations.",
          },
        }),
  };

  return NextResponse.json(body, {
    status: health.healthy ? 200 : 503,
  });
}
