import { prisma } from "@/lib/db/prisma";

export class AnalyticsService {
  static async getDashboardMetrics(userId: string) {
    const [resumes, applications, opportunities, aiUsage] = await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.application.count({ where: { userId } }),
      prisma.jobOpportunity.count({ where: { userId } }),
      prisma.aIUsage.aggregate({
        where: { userId },
        _sum: { estimatedCost: true, promptTokens: true, completionTokens: true },
      }),
    ]);

    return {
      totalResumes: resumes,
      totalApplications: applications,
      savedOpportunities: opportunities,
      aiCost: aiUsage._sum.estimatedCost ?? 0,
      totalTokens: (aiUsage._sum.promptTokens ?? 0) + (aiUsage._sum.completionTokens ?? 0),
    };
  }

  static async getWeeklyTrends(userId: string, days = 28) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const apps = await prisma.application.findMany({
      where: { userId, createdAt: { gte: cutoff } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" }
    });
    
    // Group by week (last 4 weeks)
    const weeks: Record<string, { apps: number; interviews: number }> = {};
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      weeks[`Week ${4 - i}`] = { apps: 0, interviews: 0 };
    }

    apps.forEach(app => {
      const diffTime = Math.abs(new Date().getTime() - app.createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let weekKey = "Week 4";
      if (diffDays <= 7) weekKey = "Week 4";
      else if (diffDays <= 14) weekKey = "Week 3";
      else if (diffDays <= 21) weekKey = "Week 2";
      else if (diffDays <= 28) weekKey = "Week 1";

      if (weeks[weekKey]) {
        weeks[weekKey].apps += 1;
        if (app.status === "interview") {
          weeks[weekKey].interviews += 1;
        }
      }
    });

    const labels = Object.keys(weeks);
    return {
      labels,
      datasets: [
        {
          label: "Applications",
          data: labels.map(l => weeks[l].apps),
        },
        {
          label: "Interviews",
          data: labels.map(l => weeks[l].interviews),
        }
      ]
    };
  }
}
