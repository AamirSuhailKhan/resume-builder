/**
 * POST /api/job/insights
 * GET  /api/job/insights
 *
 * GET  — Returns the market report only (no resume needed).
 *         Use this to show trending skills on a public dashboard.
 *
 * POST — Accepts a resume JSON and returns the full JobIntelligenceOutput,
 *         including the skill gap report and salary estimate.
 *
 * POST Request body:
 * {
 *   resume: ResumeData   // same shape as the builder's resume JSON
 *   forceRefresh?: boolean  // bypass market cache
 * }
 *
 * Response (POST):
 * {
 *   top_skills: string[],
 *   top_tools: string[],
 *   demand_frequency: Record<string, number>,
 *   user_match_score: number,
 *   missing_skills: string[],
 *   market_insight: string,
 *   salary_estimate: { min, max, currency },
 *   _meta: { totalJobs, generatedAt, cacheHit }
 * }
 */

import { NextResponse } from "next/server";
import { computeMarketReport } from "@/lib/job-intelligence/market-analyzer";
import { computeSkillGap } from "@/lib/job-intelligence/skill-gap";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";

// ─── GET — Market overview only ────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const report = await computeMarketReport(forceRefresh);

    return NextResponse.json({
      totalJobs: report.totalJobs,
      generatedAt: report.generatedAt,
      topSkills: report.topSkills,
      topTools: report.topTools,
      seniorityBreakdown: report.seniorityBreakdown,
      domainBreakdown: report.domainBreakdown,
    });
  } catch (error: any) {
    console.error("[GET /api/job/insights]", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}

// ─── POST — Full intelligence output for a specific resume ────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.resume || typeof body.resume !== "object") {
      return NextResponse.json(
        { error: "Request body must include a `resume` object." },
        { status: 400 }
      );
    }

    const forceRefresh = body.forceRefresh === true;
    const cacheHit = !forceRefresh;

    // ── Compute market report (cached or fresh) ──────────────────────────────
    const market = await computeMarketReport(forceRefresh);

    // ── Compute skill gap ─────────────────────────────────────────────────────
    const gap = computeSkillGap(body.resume, market);

    // ── Assemble demand_frequency map ────────────────────────────────────────
    const demand_frequency: Record<string, number> = {};
    for (const sf of [...market.topSkills, ...market.topTools]) {
      demand_frequency[sf.skill] = sf.percentage;
    }

    const output: JobIntelligenceOutput = {
      top_skills: market.topSkills.map((s) => s.skill),
      top_tools: market.topTools.map((t) => t.skill),
      demand_frequency,
      user_match_score: gap.user_match_score,
      missing_skills: gap.missing_skills,
      market_insight: gap.market_insight,
      salary_estimate: gap.salary_estimate,
    };

    return NextResponse.json({
      ...output,
      _meta: {
        totalJobs: market.totalJobs,
        generatedAt: market.generatedAt,
        cacheHit,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/job/insights]", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
