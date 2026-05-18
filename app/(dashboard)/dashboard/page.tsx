import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommandCenter } from "@/features/analytics/CommandCenter";
import { WellbeingWidget } from "@/components/wellbeing/WellbeingWidget";
import { prisma } from "@/lib/db/prisma";
import { MarketWeatherWidget } from "@/components/dashboard/MarketWeatherWidget";

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

  return (
    <>
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
