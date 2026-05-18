import { prisma } from "@/lib/db/prisma";
import { MemoryRetriever } from "@/lib/orchestration/memory";
import { getCachedCoachPrompt, setCachedCoachPrompt } from "@/lib/coach/cache";
import { inferCollegeTier } from "@/lib/coach/college-tier";
import { getMarketContextForRole } from "@/lib/coach/market-context";
import {
  assembleContextSections,
  buildMockInterviewAppendix,
  getCoachName,
  personalityBlock,
} from "@/lib/coach/prompts";
import { analyzeRejectionPatterns } from "@/lib/coach/rejection-patterns";
import { computeResumeAbTest } from "@/lib/coach/resume-ab-test";
import type { MockInterviewMetadata } from "@/lib/coach/types";
import {
  enrichMockMetadataWithCompany,
  parseMockMetadata,
} from "@/lib/coach/mock-interview";

function firstName(name: string | null | undefined, email: string): string {
  if (name?.trim()) return name.trim().split(/\s+/)[0]!;
  return email.split("@")[0] ?? "there";
}

function summarizeResume(data: unknown, title: string, version: number): string {
  if (!data || typeof data !== "object") return `${title} (v${version}): no structured data`;
  const d = data as Record<string, unknown>;
  const personal = (d.personal as Record<string, unknown>) ?? {};
  const experience = Array.isArray(d.experience) ? d.experience : [];
  const skills = Array.isArray(d.skills) ? d.skills : [];

  const bullets = experience.slice(0, 3).map((exp) => {
    if (!exp || typeof exp !== "object") return "";
    const e = exp as Record<string, unknown>;
    const points = String(e.points ?? "").slice(0, 200);
    return `- ${e.role ?? "Role"} at ${e.company ?? "Company"}: ${points}`;
  });

  return [
    `${title} (version ${version})`,
    `Headline summary: ${String(personal.summary ?? "").slice(0, 300)}`,
    `Top experience:\n${bullets.filter(Boolean).join("\n") || "none"}`,
    `Skills: ${skills.slice(0, 15).join(", ") || "none listed"}`,
  ].join("\n");
}

function jsonGoals(goals: unknown): { targetRoles: string[]; urgency?: string } {
  if (!goals || typeof goals !== "object" || Array.isArray(goals)) return { targetRoles: [] };
  const g = goals as Record<string, unknown>;
  const roles = Array.isArray(g.targetRoles)
    ? g.targetRoles.map(String)
    : typeof g.targetRole === "string"
      ? [g.targetRole]
      : [];
  const result: { targetRoles: string[]; urgency?: string } = { targetRoles: roles };
  if (typeof g.urgency === "string") result.urgency = g.urgency;
  return result;
}

export async function buildCoachSystemPrompt(
  userId: string,
  sessionOptions?: { mode?: string; metadata?: unknown }
): Promise<string> {
  const cached = await getCachedCoachPrompt(userId);
  const coachName = getCoachName();

  let mockAppendix = "";
  if (sessionOptions?.mode === "mock_interview") {
    let meta = parseMockMetadata(sessionOptions.metadata) ?? {
      phase: "setup" as const,
      questionIndex: 0,
      scores: [],
    };
    meta = await enrichMockMetadataWithCompany(meta);
    mockAppendix = buildMockInterviewAppendix(meta);
  }

  if (cached && !mockAppendix) return cached;

  const [user, careerProfile, resumes, applications, existingInsight, memories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, plan: true },
    }),
    prisma.careerProfile.findUnique({ where: { userId } }),
    prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: { id: true, title: true, version: true, data: true },
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.coachInsight.findUnique({ where: { userId } }),
    MemoryRetriever.retrieve({ userId, intent: "coaching", limit: 5 }),
  ]);

  const email = user?.email ?? "user@example.com";
  const userFirstName = firstName(user?.name, email);

  let rejectionAnalysis = existingInsight?.rejection as ReturnType<typeof analyzeRejectionPatterns> | null;
  if (!rejectionAnalysis || typeof rejectionAnalysis !== "object") {
    rejectionAnalysis = analyzeRejectionPatterns(applications);
    await prisma.coachInsight.upsert({
      where: { userId },
      create: {
        userId,
        rejection: rejectionAnalysis as object,
        updatedAt: new Date(),
      },
      update: {
        rejection: rejectionAnalysis as object,
        updatedAt: new Date(),
      },
    });
  }

  const abTests = computeResumeAbTest(
    applications,
    resumes.map((r) => ({ id: r.id, title: r.title, version: r.version }))
  );

  const latestResumeData = resumes[0]?.data;
  const education =
    latestResumeData && typeof latestResumeData === "object"
      ? (latestResumeData as Record<string, unknown>).education
      : null;
  const college = inferCollegeTier(education);

  const goals = jsonGoals(careerProfile?.goals);
  const targetRole = goals.targetRoles[0] ?? null;
  const marketContext = await getMarketContextForRole(targetRole);

  const salary =
    careerProfile?.salaryExpectation && typeof careerProfile.salaryExpectation === "object"
      ? JSON.stringify(careerProfile.salaryExpectation)
      : "Not set";

  const applicationLines = applications
    .slice(0, 20)
    .map(
      (a) =>
        `- ${a.company} / ${a.role}: ${a.status} (match ${a.matchScore}%)${a.appliedAt ? `, applied ${a.appliedAt.toISOString().slice(0, 10)}` : ""}`
    )
    .join("\n");

  const abLines =
    abTests.length > 0
      ? abTests
          .map(
            (r) =>
              `- "${r.resumeTitle}" v${r.version}: ${r.applications} apps, ${Math.round(r.interviewRate * 100)}% interview rate${r.isWinner ? " [BEST PERFORMER]" : ""}`
          )
          .join("\n")
      : "No resume A/B data yet — user hasn't applied with multiple resume versions.";

  const memoryLines =
    memories.length > 0
      ? memories.map((m) => `- [${m.type}] ${m.title}: ${m.content.slice(0, 200)}`).join("\n")
      : "No career memories stored yet.";

  const contextBody = assembleContextSections({
    Profile: [
      `Email: ${email}`,
      `Plan: ${user?.plan ?? "free"}`,
      careerProfile?.headline ? `Headline: ${careerProfile.headline}` : "",
      goals.targetRoles.length ? `Target roles: ${goals.targetRoles.join(", ")}` : "Target roles: not set",
      goals.urgency ? `Job search urgency: ${goals.urgency}` : "",
      `Salary expectation: ${salary}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Resume versions (latest 2)": resumes.length
      ? resumes.map((r) => summarizeResume(r.data, r.title, r.version)).join("\n\n")
      : "No resumes on file.",
    "Application history (last 20)": applicationLines || "No applications yet.",
    "Rejection pattern analysis": [
      rejectionAnalysis.patternSummary,
      `Rejection rate: ${Math.round(rejectionAnalysis.rejectionRate * 100)}%`,
      `Last 30 days rejections: ${rejectionAnalysis.rejectionsLast30Days}`,
      rejectionAnalysis.likelyCauses.length
        ? `Likely causes: ${rejectionAnalysis.likelyCauses.join("; ")}`
        : "",
      rejectionAnalysis.topRejectedCompanies.length
        ? `Top rejected companies: ${rejectionAnalysis.topRejectedCompanies.map((c) => `${c.company} (${c.count})`).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    "Resume A/B test results": abLines,
    "Education / college tier": `${college.summary}\nSchools: ${college.schools.join(", ") || "unknown"}\nTier: ${college.tier}`,
    "Career memories": memoryLines,
    "Market conditions": marketContext,
  });

  const prompt = `${personalityBlock(coachName, userFirstName)}

Here is everything you know about ${userFirstName}:

${contextBody}
${mockAppendix}`;

  if (!mockAppendix) {
    await setCachedCoachPrompt(userId, prompt);
  }

  return prompt;
}

export async function refreshRejectionInsight(userId: string): Promise<void> {
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const rejectionAnalysis = analyzeRejectionPatterns(applications);
  await prisma.coachInsight.upsert({
    where: { userId },
    create: {
      userId,
      rejection: rejectionAnalysis as object,
      updatedAt: new Date(),
    },
    update: {
      rejection: rejectionAnalysis as object,
      updatedAt: new Date(),
    },
  });
}
