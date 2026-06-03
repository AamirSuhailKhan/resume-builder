import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { ZenDashboard } from "@/components/dashboard/ZenDashboard";
import { cookies } from "next/headers";
import { CacheService, CacheKeys } from "@/lib/cache/cache.service";

function onboardingComplete(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "onboardingComplete" in value &&
      value.onboardingComplete === true
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const hasCompletionCookie = cookieStore.get("onboarding_complete")?.value === "true";

  if (!hasCompletionCookie) {
    const profile = await prisma.careerProfile.findUnique({
      where: { userId },
      select: { autonomyPolicy: true },
    });

    if (!onboardingComplete(profile?.autonomyPolicy)) {
      redirect("/onboarding");
    }
  }

  // Cache dashboard stats for 2 minutes — recomputed lazily
  const cachedStats = await CacheService.remember(
    CacheKeys.dashboardStats(userId),
    async () => {
      const [resumeCount, applicationStats, upcomingInterview] = await Promise.all([
        prisma.resume.count({ where: { userId } }),
        prisma.application.groupBy({
          by: ["status"],
          where: { userId },
          _count: { status: true },
        }),
        prisma.application.findFirst({
          where: { userId, status: "interview" },
          orderBy: { updatedAt: "desc" },
          select: { id: true, company: true, role: true, updatedAt: true },
        }),
      ]);
      return { resumeCount, applicationStats, upcomingInterview };
    },
    120
  );

  const { resumeCount, applicationStats, upcomingInterview } = cachedStats;

  const totalApplied =
    applicationStats.find((s: any) => s.status === "applied")?._count?.status ?? 0;
  const totalInterviews =
    applicationStats.find((s: any) => s.status === "interview")?._count?.status ?? 0;
  const totalOffers =
    applicationStats.find((s: any) => s.status === "offer")?._count?.status ?? 0;
  const totalApplications = applicationStats.reduce((sum: number, s: any) => sum + s._count.status, 0);

  const formattedInterview = upcomingInterview
    ? {
        id: upcomingInterview.id,
        company: upcomingInterview.company,
        role: upcomingInterview.role,
        updatedAt: new Date(upcomingInterview.updatedAt).toISOString(),
      }
    : null;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <ZenDashboard
        stats={{
          totalApplications,
          resumeCount,
          hasPendingApproval: false,
          upcomingInterview: formattedInterview,
          totalOffers,
          totalApplied,
        }}
      />
    </main>
  );
}
