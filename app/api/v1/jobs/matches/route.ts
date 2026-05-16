import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CacheService } from "@/lib/cache/cache.service";
import { JobsSearchService } from "@/lib/search/jobs.search";
import { JOBS_INDEX, meilisearch } from "@/lib/search/meilisearch";
import { TimingIntelligenceService, type TimingAdvice } from "@/lib/services/timing-intelligence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type JobFeedHit = {
  id: string;
  externalId?: string;
  title?: string;
  role?: string;
  company?: string;
  location?: string | null;
  remote?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  employmentType?: string | null;
  experienceLevel?: string | null;
  skills?: string[];
  source?: string;
  sourceUrl?: string | null;
  postedAt?: string;
  description?: string;
};

type NormalizedJob = {
  externalId: string;
  role: string;
  company: string;
  location: string | null;
  salaryRange: string | null;
  description: string;
  skills: string[];
  source: string;
  sourceUrl: string | null;
  postedAt: string | null;
  remote: boolean;
  employmentType: string | null;
  experienceLevel: string | null;
};

type MatchResult = {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  match: number;
  stage: "hot" | "warm" | "watch";
  skills: string[];
  missing: string[];
  sourceUrl: string | null;
  description: string;
  postedAt: string | null;
  ghostScore?: number | undefined;
  ghostVerdict?: string | undefined;
  healthScore?: number | null;
  timingAdvice?: TimingAdvice;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.+#]+/g, " ").trim();
}

function containsTerm(haystack: string, term: string) {
  const normalized = normalizeTerm(term);
  return normalized.length > 1 && normalizeTerm(haystack).includes(normalized);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function salaryRange(hit: JobFeedHit) {
  if (typeof hit.salaryMin === "number" && typeof hit.salaryMax === "number") {
    const currency = hit.currency || "USD";
    return `${currency} ${hit.salaryMin.toLocaleString()} - ${hit.salaryMax.toLocaleString()}`;
  }
  if (typeof hit.salaryMin === "number") return `${hit.currency || "USD"} ${hit.salaryMin.toLocaleString()}+`;
  return null;
}

function normalizeHit(hit: JobFeedHit): NormalizedJob {
  const role = hit.title ?? hit.role ?? "Untitled role";
  const company = hit.company ?? "Unknown company";
  const description = hit.description ?? "";
  const location = hit.location ?? (hit.remote ? "Remote" : null);

  return {
    externalId: hit.externalId ?? hit.id,
    role,
    company,
    location,
    salaryRange: salaryRange(hit),
    description,
    skills: unique(stringList(hit.skills)),
    source: hit.source ?? "Meilisearch",
    sourceUrl: hit.sourceUrl ?? null,
    postedAt: hit.postedAt ?? null,
    remote: Boolean(hit.remote) || (location?.toLowerCase().includes("remote") ?? false),
    employmentType: hit.employmentType ?? null,
    experienceLevel: hit.experienceLevel ?? null,
  };
}

function profileSearchTerms(profile: { headline: string | null; goals: Prisma.JsonValue | null } | null) {
  const goals = asRecord(profile?.goals);
  return unique([
    ...stringList(goals.targetRoles).slice(0, 3),
    ...stringList(goals.targetCompanies).slice(0, 2),
    ...(profile?.headline ? [profile.headline] : []),
  ]);
}

function resumeSkills(resumeData: Prisma.JsonValue | null | undefined) {
  const resume = asRecord(resumeData);
  return unique([
    ...stringList(resume.skills),
    ...stringList(asRecord(resume.technicalSkills).skills),
  ]);
}

function resumeLocation(resumeData: Prisma.JsonValue | null | undefined) {
  const resume = asRecord(resumeData);
  const personalInfo = asRecord(resume.personalInfo);
  const personal = asRecord(resume.personal);
  const location = personalInfo.location ?? personal.location ?? resume.location;
  return typeof location === "string" && location.trim() ? location.trim() : null;
}

function computeMatch(job: NormalizedJob, context: { skills: string[]; terms: string[]; location: string | null }) {
  const haystack = `${job.role} ${job.company} ${job.description} ${job.skills.join(" ")}`;
  const matchedSkills = context.skills.filter((skill) => containsTerm(haystack, skill));
  const explicitMatched = job.skills.filter((skill) => context.skills.some((userSkill) => normalizeTerm(userSkill) === normalizeTerm(skill)));
  const matched = unique([...matchedSkills, ...explicitMatched]);
  const missing = job.skills.filter((skill) => !matched.some((item) => normalizeTerm(item) === normalizeTerm(skill)));

  const skillDenominator = Math.max(job.skills.length, Math.min(context.skills.length, 8), 1);
  const skillScore = Math.min(matched.length / skillDenominator, 1);

  const roleMatches = context.terms.filter((term) => containsTerm(haystack, term)).length;
  const roleScore = context.terms.length > 0 ? Math.min(roleMatches / Math.min(context.terms.length, 3), 1) : 0.5;

  const preferredLocation = context.location?.toLowerCase();
  const jobLocation = job.location?.toLowerCase() ?? "";
  const locationScore = job.remote || !preferredLocation || jobLocation.includes(preferredLocation) || preferredLocation.includes(jobLocation) ? 1 : 0.35;

  const postedAt = job.postedAt ? new Date(job.postedAt).getTime() : NaN;
  const ageDays = Number.isFinite(postedAt) ? (Date.now() - postedAt) / 86_400_000 : 30;
  const recencyScore = ageDays <= 7 ? 1 : ageDays <= 30 ? 0.7 : 0.35;

  return {
    score: clampScore(35 + skillScore * 35 + roleScore * 20 + locationScore * 5 + recencyScore * 5),
    matched,
    missing,
  };
}

async function searchFeed(userId: string, query: string, limit: number): Promise<JobFeedHit[]> {
  try {
    const [result, ranked] = await Promise.all([
      meilisearch.index<JobFeedHit>(JOBS_INDEX).search(query, { limit }),
      JobsSearchService.searchFast({ query, limit }).catch(() => []),
    ]);
    const rank = new Map(ranked.map((job, index) => [job.id, index]));
    return result.hits.sort((a, b) => (rank.get(a.id) ?? limit) - (rank.get(b.id) ?? limit));
  } catch (error) {
    console.warn("[jobs.matches] Meilisearch unavailable, falling back to stored opportunities", error);
    const tokens = unique(query.split(/\s+/).filter((token) => token.length > 2)).slice(0, 5);
    const filters: Prisma.JobOpportunityWhereInput[] = tokens.flatMap((token) => [
      { role: { contains: token, mode: "insensitive" } },
      { company: { contains: token, mode: "insensitive" } },
      { description: { contains: token, mode: "insensitive" } },
    ]);
    const fallback = await prisma.jobOpportunity.findMany({
      where: filters.length > 0 ? { userId, OR: filters } : { userId },
      orderBy: { matchScore: "desc" },
      take: limit,
    });

    return fallback.map((job) => {
      const parsed = asRecord(job.parsed);
      return {
        id: job.id,
        title: job.role,
        company: job.company,
        location: job.location,
        description: job.description,
        skills: stringList(parsed.skills),
        sourceUrl: job.sourceUrl,
        source: "database",
      };
    });
  }
}

async function upsertOpportunity(userId: string, job: NormalizedJob, matchScore: number, missing: string[]) {
  const identity: Prisma.JobOpportunityWhereInput[] = [];
  if (job.sourceUrl) identity.push({ sourceUrl: job.sourceUrl });
  identity.push({ company: job.company, role: job.role, location: job.location });

  const parsed = {
    externalId: job.externalId,
    source: job.source,
    skills: job.skills,
    missing,
    remote: job.remote,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    postedAt: job.postedAt,
  } satisfies Prisma.InputJsonObject;

  const data = {
    company: job.company,
    role: job.role,
    location: job.location,
    salaryRange: job.salaryRange,
    description: job.description || "No description provided.",
    matchScore,
    sourceUrl: job.sourceUrl,
    sourceType: "verified" as const,
    parsed,
  };

  const existing = await prisma.jobOpportunity.findFirst({
    where: { userId, OR: identity },
    select: { id: true },
  });

  if (existing) {
    return prisma.jobOpportunity.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.jobOpportunity.create({
    data: {
      userId,
      ...data,
    },
  });
}

function toMatchResult(job: Awaited<ReturnType<typeof upsertOpportunity>>): MatchResult {
  const parsed = asRecord(job.parsed);
  const match = job.matchScore;
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    location: job.location ?? "Remote",
    salary: job.salaryRange ?? "Competitive",
    match,
    stage: match >= 90 ? "hot" : match >= 75 ? "warm" : "watch",
    skills: stringList(parsed.skills).slice(0, 6),
    missing: stringList(parsed.missing).slice(0, 5),
    sourceUrl: job.sourceUrl,
    description: job.description,
    postedAt: typeof parsed.postedAt === "string" ? parsed.postedAt : null,
    ...(job.ghostScore !== null && job.ghostScore !== undefined ? { ghostScore: job.ghostScore } : {}),
    ...(asRecord(job.ghostSignals)?.verdict ? { ghostVerdict: asRecord(job.ghostSignals)?.verdict as string } : {}),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return apiError("Please sign in to continue.", 401);

    const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 24);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 50)) : 24;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true },
    });
    const [profile, activeResume, latestResume] = await Promise.all([
      prisma.careerProfile.findUnique({
        where: { userId },
        select: { headline: true, goals: true },
      }),
      user?.activeResumeId
        ? prisma.resume.findFirst({ where: { id: user.activeResumeId, userId }, select: { data: true, updatedAt: true } })
        : Promise.resolve(null),
      prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { data: true, updatedAt: true },
      }),
    ]);

    const resume = activeResume ?? latestResume;
    const skills = resumeSkills(resume?.data);
    const terms = profileSearchTerms(profile);
    const location = req.nextUrl.searchParams.get("location")?.trim() || resumeLocation(resume?.data);
    const query = req.nextUrl.searchParams.get("q")?.trim() || unique([...terms, ...skills.slice(0, 6)]).join(" ") || "software engineer";

    const hits = await searchFeed(userId, query, limit);
    const computed = await Promise.all(
      hits.map(async (hit) => {
        const normalized = normalizeHit(hit);
        const match = computeMatch(normalized, { skills, terms, location });
        const opportunity = await upsertOpportunity(userId, normalized, match.score, match.missing);
        return toMatchResult(opportunity);
      })
    );

    const companyIntel = await prisma.companyIntelligence.findMany({
      where: { companyName: { in: unique(computed.map((job) => job.company)) } },
      select: { companyName: true, healthScore: true },
    }).catch(() => []);
    const healthByCompany = new Map(companyIntel.map((item) => [item.companyName.toLowerCase(), item.healthScore]));

    const jobs = await Promise.all(computed.sort((a, b) => b.match - a.match).slice(0, limit).map(async (job) => {
      const postedAt = job.postedAt ? new Date(job.postedAt) : new Date();
      const timingAdvice = await TimingIntelligenceService.getTimingAdvice({
        company: job.company,
        industry: "tech",
        postedAt: Number.isNaN(postedAt.getTime()) ? new Date() : postedAt,
      });

      return {
        ...job,
        healthScore: healthByCompany.get(job.company.toLowerCase()) ?? null,
        timingAdvice,
      };
    }));
    await CacheService.set(`jobs:matches:${userId}`, { count: jobs.length, generatedAt: new Date().toISOString() }, 120);

    return apiOk({ jobs, generatedAt: new Date().toISOString(), query });
  } catch (error) {
    return errorToResponse(error);
  }
}
