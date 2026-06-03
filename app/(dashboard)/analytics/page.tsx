import { AnalyticsDashboard } from "@/features/analytics/AnalyticsDashboard";
import { ApplicationHealthDashboard } from "@/components/analytics/ApplicationHealthDashboard";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CacheService, CacheKeys } from "@/lib/cache/cache.service";
import { Suspense } from "react";

export const metadata = {
  title: "Analytics | CareerOS",
};

async function AnalyticsData() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const CACHE_TTL = 300; // 5 minutes

  // Parallelise both service calls + cache both independently
  const [metrics, trends] = await Promise.all([
    CacheService.remember(
      CacheKeys.analyticsHealth(userId),
      () => AnalyticsService.getDashboardMetrics(userId),
      CACHE_TTL
    ),
    CacheService.remember(
      CacheKeys.weeklyTrends(userId),
      () => AnalyticsService.getWeeklyTrends(userId),
      CACHE_TTL
    ),
  ]);

  const appsData = trends.datasets.find((d) => d.label === "Applications")?.data ?? [];
  const interviewsData = trends.datasets.find((d) => d.label === "Interviews")?.data ?? [];

  const trendData = trends.labels.map((label, i) => ({
    week: label,
    interviews: interviewsData[i] || 0,
    resumeScore: 0,
    responseRate: (appsData[i] ?? 0) > 0 ? Math.round(((interviewsData[i] ?? 0) / (appsData[i] ?? 1)) * 100) : 0,
  }));

  const totalApps = appsData.reduce((a, b) => a + b, 0);
  const totalInterviews = interviewsData.reduce((a, b) => a + b, 0);
  const realResponseRate = totalApps > 0 ? Math.round((totalInterviews / totalApps) * 100) : 0;

  const dashboardMetrics = {
    responseRate: `${realResponseRate}%`,
    resumeScore: metrics.resumeScore.toString(),
    interviewPace: totalInterviews.toString(),
  };

  return <AnalyticsDashboard trendData={trendData} metrics={dashboardMetrics} />;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-8 px-6">
      {/* ApplicationHealthDashboard fetches its own data client-side, wrap in Suspense */}
      <ApplicationHealthDashboard />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-surface-muted" />}>
        <AnalyticsData />
      </Suspense>
    </div>
  );
}

