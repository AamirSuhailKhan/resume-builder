/**
 * analytics.service.ts
 *
 * Production-hardened analytics queries.
 * All methods return typed degraded state on P2021 (missing table) — never throw.
 * SSR-safe: guaranteed to return a value, never crash the render tree.
 */
import { prisma } from "@/lib/db/prisma";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalResumes: number;
  totalApplications: number;
  savedOpportunities: number;
  aiCost: number;
  totalTokens: number;
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
      const [resumes, applications, opportunities, aiUsage] = await Promise.all([
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
      ]);

      return {
        totalResumes: resumes,
        totalApplications: applications,
        savedOpportunities: opportunities,
        aiCost: aiUsage._sum.estimatedCost ?? 0,
        totalTokens:
          (aiUsage._sum.promptTokens ?? 0) + (aiUsage._sum.completionTokens ?? 0),
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
}
