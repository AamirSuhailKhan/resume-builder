/**
 * analytics.service.ts
 *
 * Production-hardened analytics queries.
 * All methods return typed degraded state on P2021 (missing table) — never throw.
 * SSR-safe: guaranteed to return a value, never crash the render tree.
 */
import type { AnonymousBenchmark, ApplicationAnalytics } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalResumes: number;
  totalApplications: number;
  savedOpportunities: number;
  aiCost: number;
  totalTokens: number;
  resumeScore: number;
  degraded: boolean;
  degradedReason?: string;
}

export interface WeeklyTrendsResult {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
  degraded: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2021"
  );
}

function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "P1001" || code === "P1002" || code === "P1008";
}

const EMPTY_METRICS: DashboardMetrics = {
  totalResumes: 0,
  totalApplications: 0,
  savedOpportunities: 0,
  aiCost: 0,
  totalTokens: 0,
  resumeScore: 0,
  degraded: true,
};

const EMPTY_TRENDS: WeeklyTrendsResult = {
  labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
  datasets: [
    { label: "Applications", data: [0, 0, 0, 0] },
    { label: "Interviews", data: [0, 0, 0, 0] },
  ],
  degraded: true,
};

// ── Service ───────────────────────────────────────────────────────────────────

export class AnalyticsService {
  /**
   * Returns dashboard KPIs. Schema-safe: returns zeroed metrics on any DB error.
   * Fetches each metric independently so partial success is possible.
   */
  static async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    try {
      // Run all queries concurrently. Catch each independently.
      const [resumes, applications, opportunities, aiUsage, atsScore] = await Promise.all([
        prisma.resume.count({ where: { userId } }).catch(() => 0),
        prisma.application.count({ where: { userId } }).catch(() => 0),
        prisma.jobOpportunity.count({ where: { userId } }).catch(() => 0),
        prisma.aIUsage
          .aggregate({
            where: { userId },
            _sum: {
              estimatedCost: true,
              promptTokens: true,
              completionTokens: true,
            },
          })
          .catch(() => ({ _sum: { estimatedCost: null, promptTokens: null, completionTokens: null } })),
        prisma.aTSScoreHistory
          .aggregate({
            where: { userId },
            _avg: { score: true }
          })
          .catch(() => ({ _avg: { score: null } }))
      ]);

      return {
        totalResumes: resumes,
        totalApplications: applications,
        savedOpportunities: opportunities,
        aiCost: aiUsage._sum.estimatedCost ?? 0,
        totalTokens:
          (aiUsage._sum.promptTokens ?? 0) + (aiUsage._sum.completionTokens ?? 0),
        resumeScore: Math.round(atsScore._avg.score ?? 0),
        degraded: false,
      };
    } catch (err: unknown) {
      if (isMissingTableError(err)) {
        console.warn("[AnalyticsService] Schema not ready — table missing (P2021). Returning degraded metrics.");
        return { ...EMPTY_METRICS, degradedReason: "schema_not_migrated" };
      }
      if (isConnectionError(err)) {
        console.warn("[AnalyticsService] Database connection error. Returning degraded metrics.", err);
        return { ...EMPTY_METRICS, degradedReason: "db_connection_failed" };
      }
      // Unknown error — log but don't crash SSR
      console.error("[AnalyticsService] getDashboardMetrics unexpected error:", err);
      return { ...EMPTY_METRICS, degradedReason: "unknown_error" };
    }
  }

  /**
   * Returns weekly application/interview trends for the last N days.
   * Schema-safe: returns empty datasets on DB error.
   */
  static async getWeeklyTrends(
    userId: string,
    days = 28
  ): Promise<WeeklyTrendsResult> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const apps = await prisma.application.findMany({
        where: { userId, createdAt: { gte: cutoff } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      });

      const weeks: Record<string, { apps: number; interviews: number }> = {
        "Week 1": { apps: 0, interviews: 0 },
        "Week 2": { apps: 0, interviews: 0 },
        "Week 3": { apps: 0, interviews: 0 },
        "Week 4": { apps: 0, interviews: 0 },
      };

      apps.forEach((app) => {
        const diffTime = Math.abs(new Date().getTime() - app.createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let weekKey = "Week 4";
        if (diffDays <= 7) weekKey = "Week 4";
        else if (diffDays <= 14) weekKey = "Week 3";
        else if (diffDays <= 21) weekKey = "Week 2";
        else if (diffDays <= 28) weekKey = "Week 1";

        const bucket = weeks[weekKey];
        if (bucket) {
          bucket.apps += 1;
          if (app.status === "interview") {
            bucket.interviews += 1;
          }
        }
      });

      const labels = Object.keys(weeks);
      return {
        labels,
        datasets: [
          { label: "Applications", data: labels.map((l) => weeks[l]?.apps ?? 0) },
          { label: "Interviews", data: labels.map((l) => weeks[l]?.interviews ?? 0) },
        ],
        degraded: false,
      };
    } catch (err: unknown) {
      if (isMissingTableError(err) || isConnectionError(err)) {
        console.warn("[AnalyticsService] getWeeklyTrends — schema/DB error, returning empty trends.");
        return EMPTY_TRENDS;
      }
      console.error("[AnalyticsService] getWeeklyTrends unexpected error:", err);
      return EMPTY_TRENDS;
    }
  }

  static async computeUserAnalytics(userId: string): Promise<ApplicationAnalytics> {
    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { jobOpportunity: true },
    });

    const totalApplied = applications.length;
    const totalResponses = applications.filter((application) => application.status !== "applied").length;
    const totalInterviews = applications.filter((application) => application.status === "interview").length;
    const totalOffers = applications.filter((application) => application.status === "offer").length;

    const responseRate = totalApplied > 0 ? totalResponses / totalApplied : 0;
    const interviewRate = totalApplied > 0 ? totalInterviews / totalApplied : 0;
    const offerRate = totalApplied > 0 ? totalOffers / totalApplied : 0;

    const responded = applications.filter((application) => application.status !== "applied");
    const avgDaysToResponse = responded.length > 0
      ? responded.reduce((sum, application) => {
          const diff = application.updatedAt.getTime() - application.createdAt.getTime();
          return sum + Math.max(0, diff / 86_400_000);
        }, 0) / responded.length
      : null;

    const dayBuckets = new Map<string, { total: number; responses: number }>();
    // Hoist formatter outside loop to avoid O(n) object creation
    const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
    for (const application of applications) {
      const day = dayFormatter.format(application.createdAt);
      const bucket = dayBuckets.get(day) ?? { total: 0, responses: 0 };
      bucket.total += 1;
      if (application.status !== "applied") bucket.responses += 1;
      dayBuckets.set(day, bucket);
    }

    const bestDayOfWeek = [...dayBuckets.entries()]
      .sort((a, b) => (b[1].responses / Math.max(1, b[1].total)) - (a[1].responses / Math.max(1, a[1].total)))[0]?.[0] ?? null;

    const platformBuckets = new Map<string, { total: number; responses: number }>();
    for (const application of applications) {
      const parsed = application.jobOpportunity?.parsed;
      const parsedRecord = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
      let sourceHost = "Manual";
      if (application.jobOpportunity?.sourceUrl) {
        try {
          sourceHost = new URL(application.jobOpportunity.sourceUrl).hostname.replace(/^www\./, "");
        } catch {
          sourceHost = "Job board";
        }
      }
      const platform = typeof parsedRecord.source === "string"
        ? parsedRecord.source
        : application.jobOpportunity?.sourceUrl
          ? sourceHost
          : "Manual";
      const bucket = platformBuckets.get(platform) ?? { total: 0, responses: 0 };
      bucket.total += 1;
      if (application.status !== "applied") bucket.responses += 1;
      platformBuckets.set(platform, bucket);
    }

    const bestPlatform = [...platformBuckets.entries()]
      .sort((a, b) => (b[1].responses / Math.max(1, b[1].total)) - (a[1].responses / Math.max(1, a[1].total)))[0]?.[0] ?? null;

    return prisma.applicationAnalytics.upsert({
      where: { userId },
      create: {
        userId,
        totalApplied,
        totalResponses,
        totalInterviews,
        totalOffers,
        responseRate,
        interviewRate,
        offerRate,
        avgDaysToResponse,
        bestDayOfWeek,
        bestPlatform,
        weakestSection: null,
        lastComputedAt: new Date(),
      },
      update: {
        totalApplied,
        totalResponses,
        totalInterviews,
        totalOffers,
        responseRate,
        interviewRate,
        offerRate,
        avgDaysToResponse,
        bestDayOfWeek,
        bestPlatform,
        lastComputedAt: new Date(),
      },
    });
  }

  static async getBenchmark(roleLevel: string, industry: string, location: string): Promise<AnonymousBenchmark | null> {
    const normalizedRole = roleLevel.toLowerCase() || "mid";
    const normalizedIndustry = industry.toLowerCase() || "tech";
    const normalizedLocation = location.toLowerCase() || "india";

    // Single query: exact match first, then fallback — avoids double round-trip
    const exact = await prisma.anonymousBenchmark.findUnique({
      where: {
        roleLevel_industry_location: {
          roleLevel: normalizedRole,
          industry: normalizedIndustry,
          location: normalizedLocation,
        },
      },
    });

    if (exact) return exact;

    // Fallback: best-sampled record for the same role level
    return prisma.anonymousBenchmark.findFirst({
      where: { roleLevel: normalizedRole },
      orderBy: { sampleSize: "desc" },
    });
  }
}
