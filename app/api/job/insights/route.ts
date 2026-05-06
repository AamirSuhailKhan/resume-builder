import { NextResponse } from "next/server";
import { ResumeData } from "@/lib/storage";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";
import { saveInsights, getInsights, JobInsightsRow } from "@/lib/jobInsightsSupabase";
import crypto from "crypto";

export const runtime = "nodejs";

/** Compute a SHA‑256 hash of the resume data for cache invalidation */
function computeResumeHash(resume: ResumeData): string {
  const json = JSON.stringify(resume);
  return crypto.createHash("sha256").update(json).digest("hex");
}

/** Placeholder insight generator – replace with real AI service */
function generateInsights(resume: ResumeData, jobDescriptions: string[]): JobIntelligenceOutput {
  // Dummy implementation – in production call your ML/AI endpoint.
  const topSkills = ["JavaScript", "React", "TypeScript"];
  const missing = ["Docker", "Kubernetes"];
  return {
    top_skills: topSkills,
    missing_skills: missing,
    user_match_score: Math.floor(Math.random() * 100),
    demand_frequency: { JavaScript: 85, React: 78, TypeScript: 72 },
    salary_estimate: 85000,
    market_overview: {},
  } as any; // Cast to any for brevity.
}

export async function POST(request: Request) {
  const { resume, jobDescriptions } = await request.json();
  if (!resume || !Array.isArray(jobDescriptions)) {
    return NextResponse.json({ error: "Missing resume or jobDescriptions" }, { status: 400 });
  }

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

  try {
    const { error } = await saveInsights(payload);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to save insights" }, { status: 500 });
    }
    return NextResponse.json({ insights, resume_hash: resumeHash, engine_version: engineVersion });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save insights" }, { status: 500 });
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
