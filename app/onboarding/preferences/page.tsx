import { redirect } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PreferencesForm } from "@/components/onboarding/PreferencesForm";
import { prisma } from "@/lib/db/prisma";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export default async function OnboardingPreferencesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const profile = await prisma.careerProfile.findUnique({
    where: { userId },
    select: { preferences: true },
  });
  const preferences = jsonObject(profile?.preferences);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <OnboardingProgress currentStep={2} />

      <div className="grid gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-muted">
          <SlidersHorizontal className="h-5 w-5 text-accent" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Tune your search</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          These preferences seed your job matches and tell the application agent how much help you want.
        </p>
      </div>

      <PreferencesForm
        initialRoles={stringArray(preferences.roles)}
        initialLocations={stringArray(preferences.locations)}
      />
    </div>
  );
}
