import { JobMatchDashboard } from "@/features/jobs/JobMatchDashboard";
import { JobsService } from "@/lib/services/jobs.service";
import { JobMatch } from "@/features/platform/data";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { isIndiaLocation } from "@/lib/domain/jobs/providers/india";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  
  const [opportunities, profile, indiaTracks] = await Promise.all([
    JobsService.getOpportunitiesForUser(session.user.id),
    prisma.careerProfile.findUnique({
      where: { userId: session.user.id },
      select: { constraints: true },
    }),
    prisma.indiaCompanyTrack.findMany({
      select: { companyName: true, companySlug: true },
    }),
  ]);
  
  // Build a lowercase name -> slug map for O(1) job card lookup
  const indiaTrackMap = new Map(
    indiaTracks.map((t) => [t.companyName.toLowerCase(), t.companySlug])
  );
  const constraints = asRecord(profile?.constraints);
  const profileLocations = stringList(constraints.locations);
  const defaultIndiaOnly = profileLocations.some((location) => isIndiaLocation(location));
  
  const mappedJobs: JobMatch[] = opportunities.map(job => {
    const parsed = typeof job.parsed === "object" && job.parsed !== null && !Array.isArray(job.parsed)
      ? job.parsed as { skills?: unknown; missing?: unknown; isIndia?: unknown; source?: unknown }
      : {};
    const location = job.location || "Remote";
    return {
      id: job.id,
      company: job.company,
      role: job.role,
      location,
      salary: job.salaryRange || "Competitive",
      match: job.matchScore,
      stage: job.matchScore >= 90 ? "hot" : job.matchScore >= 70 ? "warm" : "watch",
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
      isIndia: Boolean(parsed.isIndia) || isIndiaLocation(location),
      indiaTrackSlug: indiaTrackMap.get(job.company.toLowerCase()) ?? null,
      ...(typeof parsed.source === "string" ? { source: parsed.source } : {}),
      sourceUrl: job.sourceUrl,
      description: job.description,
      scamScore: job.scamScore,
      scamVerdict: job.scamVerdict,
      scamReports: job.scamReports,
      scamSignals: typeof job.scamSignals === "object" && job.scamSignals !== null && !Array.isArray(job.scamSignals)
        ? (job.scamSignals as any).signals || null
        : null,
    };
  });

  return <JobMatchDashboard initialJobs={mappedJobs} defaultIndiaOnly={defaultIndiaOnly} />;
}
