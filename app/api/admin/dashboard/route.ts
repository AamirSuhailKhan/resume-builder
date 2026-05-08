import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Queue } from "bullmq";
import { queueNames } from "@/lib/queue/types";
import { getQueueRedisConnection } from "@/lib/queue/connection";
import { subDays } from "date-fns";

export const runtime = "nodejs";

type QueueHealthStats = Record<string, {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}>;

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [aiStats, providerStats, queueStats, atsLatency] = await Promise.allSettled([
    getAiCostStats(),
    getProviderStats(),
    getQueueStats(),
    getAtsLatencyStats(),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    ai: aiStats.status === "fulfilled" ? aiStats.value : { error: "unavailable" },
    providers: providerStats.status === "fulfilled" ? providerStats.value : { error: "unavailable" },
    queues: queueStats.status === "fulfilled" ? queueStats.value : { error: "unavailable" },
    atsLatency: atsLatency.status === "fulfilled" ? atsLatency.value : { error: "unavailable" },
  });
}

async function getAiCostStats() {
  const since = subDays(new Date(), 1);
  const usages = await prisma.aIUsage.groupBy({
    by: ["provider", "model"],
    where: { createdAt: { gte: since } },
    _sum: { estimatedCost: true, promptTokens: true, completionTokens: true },
    _count: { id: true },
  });

  const totalCost = usages.reduce((s, u) => s + (u._sum.estimatedCost ?? 0), 0);
  return { totalCostUsd: Math.round(totalCost * 10000) / 10000, breakdown: usages };
}

async function getProviderStats() {
  const since = subDays(new Date(), 1);
  const events = await prisma.providerEvent.groupBy({
    by: ["provider"],
    where: { createdAt: { gte: since } },
    _sum: { jobsFetched: true, jobsInserted: true },
    _count: { id: true },
    _avg: { durationMs: true },
  });

  const failures = await prisma.providerEvent.groupBy({
    by: ["provider"],
    where: { createdAt: { gte: since }, success: false },
    _count: { id: true },
  });

  const failMap = Object.fromEntries(failures.map((f) => [f.provider, f._count.id]));

  return events.map((e) => ({
    provider: e.provider,
    totalRuns: e._count.id,
    failures: failMap[e.provider] ?? 0,
    successRate: e._count.id > 0 ? ((e._count.id - (failMap[e.provider] ?? 0)) / e._count.id) : 1,
    jobsFetched: e._sum.jobsFetched ?? 0,
    jobsInserted: e._sum.jobsInserted ?? 0,
    avgDurationMs: Math.round(e._avg.durationMs ?? 0),
  }));
}

async function getQueueStats() {
  const connection = getQueueRedisConnection();
  const stats: QueueHealthStats = {};

  for (const [key, qName] of Object.entries(queueNames)) {
    const queue = new Queue(qName, { connection });
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    stats[qName] = { waiting, active, completed, failed };
    await queue.close();
  }

  return stats;
}

async function getAtsLatencyStats() {
  const since = subDays(new Date(), 1);
  const events = await prisma.queueEvent.findMany({
    where: { jobType: "ats_analysis", createdAt: { gte: since }, durationMs: { not: null } },
    select: { durationMs: true },
    orderBy: { durationMs: "asc" },
  });

  if (events.length === 0) return { p50: null, p95: null, p99: null, samples: 0 };

  const durations = events.map((e) => e.durationMs!).sort((a, b) => a - b);
  const p = (pct: number) => durations[Math.min(durations.length - 1, Math.floor((pct / 100) * durations.length))] ?? null;

  return {
    p50: p(50),
    p95: p(95),
    p99: p(99),
    samples: durations.length,
  };
}
