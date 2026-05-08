import crypto from "crypto";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { applyRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";
import { errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { ResumeData } from "@/lib/storage";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";
import { saveInsights, getInsights, JobInsightsRow } from "@/lib/jobInsightsSupabase";

export const runtime = "nodejs";

const resumeSchema = z.object({
  id: z.string(),
  skills: z.array(z.string()).default([]),
}).passthrough();

const requestSchema = z.object({
  resume: resumeSchema,
  jobDescriptions: z.array(z.string().min(1)).min(1),
});

function computeResumeHash(resume: ResumeData): string {
  const json = JSON.stringify(resume);
  return crypto.createHash("sha256").update(json).digest("hex");
}

function generateInsights(resume: ResumeData, jobDescriptions: string[]): JobIntelligenceOutput {
  const resumeSkills = new Set(resume.skills.map((skill) => skill.toLowerCase()));
  const corpus = jobDescriptions.join("\n").toLowerCase();
  const trackedSkills = ["javascript", "typescript", "react", "next.js", "postgresql", "prisma", "redis", "bullmq", "sentry", "accessibility"];
  const trackedTools = ["vercel", "railway", "fly.io", "render", "meilisearch", "postgresql", "redis"];
  const topSkills = trackedSkills.filter((skill) => corpus.includes(skill));
  const topTools = trackedTools.filter((tool) => corpus.includes(tool));
  const missing = topSkills.filter((skill) => !resumeSkills.has(skill));
  const covered = topSkills.length - missing.length;
  const matchScore = topSkills.length > 0 ? Math.round((covered / topSkills.length) * 100) : 0;
  const demandFrequency = Object.fromEntries(
    topSkills.map((skill) => [
      skill,
      Math.round((jobDescriptions.filter((jd) => jd.toLowerCase().includes(skill)).length / jobDescriptions.length) * 100),
    ])
  );

  return {
    top_skills: topSkills,
    top_tools: topTools,
    missing_skills: missing,
    user_match_score: matchScore,
    demand_frequency: demandFrequency,
    market_insight: topSkills.length > 0
      ? `${covered} of ${topSkills.length} tracked market skills are already present in this resume.`
      : "No tracked skills were detected in the supplied job descriptions.",
    salary_estimate: {
      min: 0,
      max: 0,
      currency: "INR",
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const limited = await applyRateLimit(request, getClientIdentifier(request), "ai");
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.parse(body);
    const resume = normalizeResume(parsed.resume);
    const jobDescriptions = parsed.jobDescriptions;
    const resumeHash = computeResumeHash(resume);
    const engineVersion = "v1";
    const insights = generateInsights(resume, jobDescriptions);

    const payload: Omit<JobInsightsRow, "created_at"> = {
      id: crypto.randomUUID(),
      resume_id: resume.id,
      resume_hash: resumeHash,
      insights,
      job_count: jobDescriptions.length,
      engine_version: engineVersion,
    };

    const { error } = await saveInsights(payload);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to save insights" }, { status: 500 });
    }

    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        provider: "google",
        model: "gemini-2.5-flash",
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0.001,
      },
    }).catch(() => undefined);

    return NextResponse.json({ insights, resume_hash: resumeHash, engine_version: engineVersion });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resumeId = searchParams.get("resume_id");
  if (!resumeId) {
    return NextResponse.json({ error: "Missing resume_id" }, { status: 400 });
  }

  try {
    const { data: row, error } = await getInsights(resumeId);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
    }
    if (!row) return NextResponse.json({ insights: null }, { status: 200 });
    return NextResponse.json({
      insights: row.insights,
      resume_hash: row.resume_hash,
      engine_version: row.engine_version,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
