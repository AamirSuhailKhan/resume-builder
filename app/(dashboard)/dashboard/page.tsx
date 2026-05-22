import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommandCenter } from "@/features/analytics/CommandCenter";
import { WellbeingWidget } from "@/components/wellbeing/WellbeingWidget";
import { prisma } from "@/lib/db/prisma";
import { MarketWeatherWidget } from "@/components/dashboard/MarketWeatherWidget";
import { TodaysFocusCard, type FocusState } from "@/components/dashboard/TodaysFocusCard";

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

  // Load user's job search state to determine today's focus
  const [resumeCount, applicationStats, upcomingInterview, pendingApproval] = await Promise.all([
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
    prisma.approvalRequest.findFirst({
      where: { userId, status: "pending", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, type: true },
    }),
  ]);

  const totalApplied =
    applicationStats.find((s) => s.status === "applied")?._count?.status ?? 0;
  const totalInterviews =
    applicationStats.find((s) => s.status === "interview")?._count?.status ?? 0;
  const totalOffers =
    applicationStats.find((s) => s.status === "offer")?._count?.status ?? 0;
  const totalApplications = applicationStats.reduce((sum, s) => sum + s._count.status, 0);

  let focusState: FocusState = "active_search";
  if (resumeCount === 0) focusState = "no_resume";
  else if (totalApplications === 0) focusState = "no_applications";
  else if (pendingApproval) focusState = "has_pending_approval";
  else if (totalOffers > 0) focusState = "has_offer";
  else if (upcomingInterview) focusState = "has_interview";
  else if (totalApplied > 0 && totalInterviews === 0) focusState = "has_applications_no_response";

  return (
    <>
      {/* Today's focus — always first, always full-width */}
      <div className="mb-6">
        <TodaysFocusCard
          state={focusState}
          data={{
            interviewCompany: upcomingInterview?.company ?? null,
            interviewRole: upcomingInterview?.role ?? null,
            totalApplied,
            totalOffers,
            approvalTitle: pendingApproval?.title ?? null,
          }}
        />
      </div>

      {/* Existing grid — keep exactly as-is */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CommandCenter />
        </div>
        <div className="flex flex-col gap-6">
          <MarketWeatherWidget />
          <WellbeingWidget />
        </div>
      </div>
    </>
  );
}
