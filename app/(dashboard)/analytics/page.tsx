import { AnalyticsDashboard } from "@/features/analytics/AnalyticsDashboard";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const metrics = await AnalyticsService.getDashboardMetrics(userId);
  const trends = await AnalyticsService.getWeeklyTrends(userId);

  // Map trends to the format needed by the charts
  const appsData = trends.datasets[0].data as number[];
  const interviewsData = trends.datasets[1].data as number[];

  const trendData = trends.labels.map((label, i) => ({
    week: label,
    interviews: interviewsData[i] || 0,
    resumeScore: 80 + (appsData[i] || 0) * 2, // simulated dynamic score for visual
    responseRate: appsData[i] > 0 ? Math.round((interviewsData[i] / appsData[i]) * 100) : 0, 
  }));

  const totalApps = appsData.reduce((a, b) => a + b, 0);
  const totalInterviews = interviewsData.reduce((a, b) => a + b, 0);
  const realResponseRate = totalApps > 0 ? Math.round((totalInterviews / totalApps) * 100) : 0;

  const dashboardMetrics = {
    responseRate: `${realResponseRate}%`, 
    resumeScore: "89", // This would ideally come from average of saved resume scores
    interviewPace: totalInterviews.toString(),
  };

  return <AnalyticsDashboard trendData={trendData} metrics={dashboardMetrics} />;
}
