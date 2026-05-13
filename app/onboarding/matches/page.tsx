import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { OnboardingJobCards, type OnboardingJobMatch } from "@/components/onboarding/OnboardingJobCards";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { JobsSearchService, type RankedJobResult } from "@/lib/search/jobs.search";

const sampleJobs: OnboardingJobMatch[] = [
  {
    id: "sample-product-engineer",
    company: "Northstar Labs",
    role: "Product Engineer",
    location: "Remote",
    description: "Build customer-facing AI workflows across product surfaces, experimentation, and integrations.",
    matchScore: 88,
  },
  {
    id: "sample-platform-engineer",
    company: "SignalWorks",
    role: "Platform Engineer",
    location: "Hybrid",
    description: "Own backend services, observability, and automation for a fast-moving hiring intelligence platform.",
    matchScore: 82,
  },
  {
    id: "sample-growth-analyst",
    company: "BrightHire",
    role: "Growth Analyst",
    location: "New York",
    description: "Partner with product and sales teams to model funnels, improve conversion, and report market signals.",
    matchScore: 76,
  },
];

function jsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapSearchResult(result: RankedJobResult, index: number): OnboardingJobMatch {
  return {
    id: result.id,
    company: result.company,
    role: result.role,
    location: "Remote or flexible",
    description: result.description,
    matchScore: Math.max(60, Math.min(96, Math.round((result.rankingFactors.score || 0.75) * 90) - index)),
  };
}

async function getMatches(userId: string, roles: string[], locations: string[]): Promise<OnboardingJobMatch[]> {
  const query = roles[0] ?? "software engineer";

  try {
    const searchParams = {
      query,
      limit: 5,
      ...(locations[0] ? { location: locations[0] } : {}),
      ...(locations.length === 0 ? { remote: true } : {}),
    };
    const fastResults = await JobsSearchService.searchFast(searchParams);

    if (fastResults.length > 0) return fastResults.map(mapSearchResult);
  } catch (error) {
    console.warn("[Onboarding] Meilisearch unavailable, falling back to Prisma.", error);
  }

  const opportunities = await prisma.jobOpportunity.findMany({
    where: { userId },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
    take: 5,
  });

  if (opportunities.length > 0) {
    return opportunities.map((job) => ({
      id: job.id,
      company: job.company,
      role: job.role,
      location: job.location ?? "Remote or flexible",
      description: job.description,
      matchScore: job.matchScore,
      sourceUrl: job.sourceUrl,
    }));
  }

  return sampleJobs;
}

export default async function OnboardingMatchesPage() {
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
  const roles = stringArray(preferences.roles);
  const locations = stringArray(preferences.locations);
  const jobs = await getMatches(userId, roles, locations);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <OnboardingProgress currentStep={3} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-muted">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">Your first matches</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Here is a starting shortlist. Your dashboard will keep improving this as resumes, applications, and market
            signals come in.
          </p>
        </div>
        <Link href="/dashboard">
          <Button size="lg">
            Enter dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      <OnboardingJobCards jobs={jobs} />
    </div>
  );
}
