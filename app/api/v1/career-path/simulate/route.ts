import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { memoryService } from "@/lib/services/memory.service";

export const runtime = "nodejs";

const schema = z.object({
  targetRole: z.string().min(1),
  targetCompany: z.string().min(1),
  jobOpportunityId: z.string().uuid().optional(),
});

const CACHE_DAYS = 7;

function buildResumeSummary(resumeData: any): string {
  const parts: string[] = [];
  const personal = resumeData?.personal ?? resumeData?.personalInfo ?? {};
  if (personal.summary) parts.push(`Summary: ${personal.summary}`);
  const exp = resumeData?.experience ?? [];
  if (exp.length > 0) {
    parts.push(`Experience: ${exp.slice(0, 3).map((e: any) => `${e.role} at ${e.company}`).join(", ")}`);
  }
  const skills = resumeData?.skills ?? [];
  if (skills.length > 0) parts.push(`Skills: ${skills.slice(0, 10).join(", ")}`);
  return parts.join(". ") || "No resume summary available.";
}

function padPaths(paths: any[]): any[] {
  const normalized = paths.slice(0, 3);
  while (normalized.length < 3) {
    normalized.push({
      path: "unknown",
      probability: 0,
      avgTimeYears: 0,
      nextRoles: [],
      salaryGrowthPct: 0,
      likelihood: "low",
    });
  }
  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

    const { targetRole, targetCompany, jobOpportunityId } = parsed.data;

    // Load resume + career profile in parallel
    const [profile, latestResume] = await Promise.all([
      prisma.careerProfile.findUnique({
        where: { userId },
        select: { goals: true, headline: true },
      }),
      prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { data: true },
      }),
    ]);

    const resumeData = latestResume?.data as any;
    const goals = profile?.goals as any;
    const currentRole =
      (resumeData?.experience?.[0]?.role ?? resumeData?.experience?.[0]?.title) ||
      profile?.headline ||
      "Not specified";
    const goalIn5Years = goals?.targetIn5Years || "Not specified";
    const resumeSummary = buildResumeSummary(resumeData);

    // Check Prisma cache — skip re-running within 7 days
    const sevenDaysAgo = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000);
    const cached = await prisma.careerPathSimulation.findFirst({
      where: {
        userId,
        targetCompany: { equals: targetCompany, mode: "insensitive" },
        targetRole: { equals: targetRole, mode: "insensitive" },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
    });
    if (cached) return NextResponse.json({ data: cached, error: null, cached: true });

    // Load relevant career memories
    let memorySummary = "";
    try {
      const memories = await memoryService.searchMemories(
        userId,
        `career goals ${targetRole}`,
        5
      );
      memorySummary = memories.map((m) => m.content).join(". ");
    } catch {
      // gracefully degrade if pgvector/OpenAI unavailable
    }

    const systemPrompt =
      "You are a career intelligence analyst. Simulate realistic career trajectories. Return ONLY valid JSON.";

    const userPrompt = `Current: ${currentRole}. Evaluating: ${targetRole} at ${targetCompany}. 5-year goal: ${goalIn5Years}. Background: ${resumeSummary}. Memories: ${memorySummary || "None available."}. 

Simulate 3 career paths — optimistic, realistic, conservative — and return:
{
  "trajectoryPaths": [
    {
      "path": "optimistic|realistic|conservative",
      "probability": 0.0-1.0,
      "avgTimeYears": number,
      "nextRoles": ["string"],
      "salaryGrowthPct": number,
      "likelihood": "high|medium|low"
    }
  ],
  "careerAlignScore": 0-100,
  "alignRationale": "string",
  "riskFactors": ["string"],
  "opportunities": ["string"],
  "skillsGained": ["string"],
  "skillsMissing": ["string"],
  "verdict": "strong_yes|yes|sideways|risky|step_back"
}`;

    const { data: aiResult } = await callClaudeJson<any>({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 2500,
    });

    const simulation = await prisma.careerPathSimulation.create({
      data: {
        userId,
        jobOpportunityId: jobOpportunityId ?? null,
        targetCompany,
        targetRole,
        currentRole,
        goalIn5Years,
        trajectoryPaths: padPaths(aiResult?.trajectoryPaths ?? []),
        careerAlignScore: Number(aiResult?.careerAlignScore ?? 50),
        alignRationale: aiResult?.alignRationale ?? "Analysis complete.",
        riskFactors: Array.isArray(aiResult?.riskFactors) ? aiResult.riskFactors : [],
        opportunities: Array.isArray(aiResult?.opportunities) ? aiResult.opportunities : [],
        skillsGained: Array.isArray(aiResult?.skillsGained) ? aiResult.skillsGained : [],
        skillsMissing: Array.isArray(aiResult?.skillsMissing) ? aiResult.skillsMissing : [],
        verdict: aiResult?.verdict ?? "sideways",
      },
    });

    return NextResponse.json({ data: simulation, error: null, cached: false });
  } catch (error: any) {
    console.error("[CareerPathSimulate] Error:", error);
    return NextResponse.json({ error: "Failed to simulate career path." }, { status: 500 });
  }
}
