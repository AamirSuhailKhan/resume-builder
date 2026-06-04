import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";
import { DashboardService } from "@/lib/services/dashboard.service";
import { CareerHealthService } from "@/lib/services/career-health.service";
import { CareerMissionControl } from "@/components/dashboard/CareerMissionControl";

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

  // Enforce onboarding check
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

  // Fetch telemetry and stats securely
  const data = await DashboardService.getDashboardData(userId);
  const healthHistory = await CareerHealthService.getHealthHistory(userId);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <CareerMissionControl data={data} initialHistory={healthHistory} />
    </main>
  );
}
