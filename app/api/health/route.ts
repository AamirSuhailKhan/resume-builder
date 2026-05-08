import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getQueueRedisConnection } from "@/lib/queue/connection";

export const runtime = "nodejs";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
    },
  };

  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "healthy";
  } catch (error) {
    health.status = "unhealthy";
    health.services.database = "unhealthy";
  }

  try {
    // Check Redis
    const redis = getQueueRedisConnection();
    await redis.ping();
    health.services.redis = "healthy";
  } catch (error) {
    health.status = "unhealthy";
    health.services.redis = "unhealthy";
  }

  return NextResponse.json(health, { status: health.status === "healthy" ? 200 : 503 });
}
