import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { startOfDay, subDays, format } from "date-fns";

/**
 * Materializes a daily analytics snapshot for a given user.
 * Called by the analytics worker — idempotent via upsert.
 */
export async function materializeSnapshot(userId: string, targetDate?: Date) {
  const date = startOfDay(targetDate ?? new Date());

  const [applications, ats, jobs] = await Promise.all([
    prisma.application.findMany({
      where: {
        userId,
        createdAt: { gte: date, lt: new Date(date.getTime() + 86400000) },
      },
      select: { status: true },
    }),
    prisma.aTSScoreHistory.findMany({
      where: {
        userId,
        createdAt: { gte: date, lt: new Date(date.getTime() + 86400000) },
      },
      select: { score: true },
    }),
    prisma.jobOpportunity.count({
      where: {
        userId,
        createdAt: { gte: date, lt: new Date(date.getTime() + 86400000) },
      },
    }),
  ]);

  const applicationsCount = applications.length;
  const interviewsCount = applications.filter((a) => a.status === "interview").length;
  const offersCount = applications.filter((a) => a.status === "offer").length;
  const avgAtsScore =
    ats.length > 0 ? ats.reduce((s, r) => s + r.score, 0) / ats.length : 0;
  const responseRate =
    applicationsCount > 0 ? interviewsCount / applicationsCount : 0;

  await prisma.analyticsSnapshot.upsert({
    where: { userId_date: { userId, date } },
    update: {
      applicationsCount,
      interviewsCount,
      offersCount,
      avgAtsScore: Math.round(avgAtsScore * 10) / 10,
      responseRate: Math.round(responseRate * 1000) / 1000,
      jobsIngested: jobs,
    },
    create: {
      userId,
      date,
      applicationsCount,
      interviewsCount,
      offersCount,
      avgAtsScore: Math.round(avgAtsScore * 10) / 10,
      responseRate: Math.round(responseRate * 1000) / 1000,
      jobsIngested: jobs,
    },
  });

  logger.info(
    { userId, date: format(date, "yyyy-MM-dd"), applicationsCount, avgAtsScore },
    "[AnalyticsSnapshot] Materialized"
  );
}

/**
 * Get the last N days of snapshots for a user — instant reads, no live aggregation.
 */
export async function getSnapshotTrend(userId: string, days = 7) {
  const since = startOfDay(subDays(new Date(), days - 1));

  const snapshots = await prisma.analyticsSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return snapshots;
}
