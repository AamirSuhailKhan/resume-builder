/**
 * lib/job-intelligence/client.ts
 *
 * Client-side SDK for the Job Intelligence Engine.
 * Import these functions in your React components — they call the API routes.
 *
 * Example usage:
 *
 *   import { analyzeJobDescriptions, getJobInsights } from "@/lib/job-intelligence/client";
 *
 *   // Feed 5+ JDs to build the market database
 *   await analyzeJobDescriptions(["Senior React Developer...", "Full Stack Engineer..."]);
 *
 *   // Get personalised insights for the current user's resume
 *   const insights = await getJobInsights(resume);
 *   console.info(insights.market_insight);
 *   // "You need AWS and TypeScript to match 78% of relevant jobs."
 */

import { ResumeData } from "@/lib/storage";
import { JobIntelligenceOutput, ParsedJob } from "./types";

// ─── Analyze JDs ──────────────────────────────────────────────────────────────

export interface AnalyzeResponse {
  parsed: ParsedJob[];
  jobsInDatabase: number;
  parseErrors?: { index: number; error: string }[];
}

/**
 * Sends one or more raw job descriptions to the parser API.
 * Results are stored server-side — call `getJobInsights` afterwards.
 */
export async function analyzeJobDescriptions(
  jobDescriptions: string[]
): Promise<AnalyzeResponse> {
  const res = await fetch("/api/job/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescriptions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `analyzeJobDescriptions failed (${res.status})`);
  }

  return res.json();
}

// ─── Get Full Insights (with resume) ─────────────────────────────────────────

export interface InsightsResponse extends JobIntelligenceOutput {
  _meta: {
    totalJobs: number;
    generatedAt: string;
    cacheHit: boolean;
  };
}

/**
 * Fetches the market report and computes a personalised skill gap for the
 * provided resume. Requires at least one JD to have been analyzed first.
 */
export async function getJobInsights(
  resume: ResumeData,
  options: { forceRefresh?: boolean } = {}
): Promise<InsightsResponse> {
  const res = await fetch("/api/job/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, forceRefresh: options.forceRefresh ?? false }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `getJobInsights failed (${res.status})`);
  }

  return res.json();
}

// ─── Get Market Overview (no resume needed) ───────────────────────────────────

export interface MarketOverview {
  totalJobs: number;
  generatedAt: string;
  topSkills: { skill: string; count: number; percentage: number }[];
  topTools: { skill: string; count: number; percentage: number }[];
  seniorityBreakdown: Record<string, number>;
  domainBreakdown: Record<string, number>;
}

/**
 * Fetches the aggregate market report without requiring a resume.
 * Useful for public dashboards showing trending skills.
 */
export async function getMarketOverview(
  forceRefresh = false
): Promise<MarketOverview> {
  const url = forceRefresh ? "/api/job/insights?refresh=true" : "/api/job/insights";
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `getMarketOverview failed (${res.status})`);
  }

  return res.json();
}
