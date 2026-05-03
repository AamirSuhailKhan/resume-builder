/**
 * ─── Module 3: Market Analyzer ────────────────────────────────────────────────
 *
 * Responsibilities (100% deterministic — NO AI):
 *  1. Pull all aggregated jobs from the repository.
 *  2. Count skill occurrences across all jobs.
 *  3. Compute frequency percentages.
 *  4. Return a MarketReport with top skills, top tools, breakdowns.
 *
 * Formula: frequency(skill) = (jobs_mentioning_skill / total_jobs) × 100
 *
 * Caching: Results are cached in-process for CACHE_TTL_MS (default 5 min).
 * Invalidated automatically whenever new jobs are saved.
 */

import { jobRepository } from "./job-aggregator";
import { isTool } from "./jd-parser";
import { MarketReport, SkillFrequency } from "./types";

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedReport: MarketReport | null = null;
let cacheTimestamp = 0;

export function invalidateMarketCache() {
  cachedReport = null;
  cacheTimestamp = 0;
}

// ─── Core Computation ─────────────────────────────────────────────────────────

/**
 * Generates a full MarketReport from all persisted jobs.
 * Results are cached for CACHE_TTL_MS milliseconds.
 *
 * @param forceRefresh - Bypass cache and recompute immediately.
 */
export async function computeMarketReport(
  forceRefresh = false
): Promise<MarketReport> {
  // Serve from cache if fresh
  if (!forceRefresh && cachedReport && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedReport;
  }

  const jobs = await jobRepository.findAll();
  const totalJobs = jobs.length;

  if (totalJobs === 0) {
    const empty: MarketReport = {
      totalJobs: 0,
      generatedAt: new Date().toISOString(),
      topSkills: [],
      topTools: [],
      seniorityBreakdown: {},
      domainBreakdown: {},
    };
    cachedReport = empty;
    cacheTimestamp = Date.now();
    return empty;
  }

  // ── Step 1: Count occurrences ────────────────────────────────────────────
  const skillCounts = new Map<string, number>();

  for (const job of jobs) {
    // Use a Set per job so a skill appearing twice in one JD counts only once
    const jobSkillSet = new Set(job.allSkills.map((s) => s.toLowerCase()));
    for (const skill of jobSkillSet) {
      // Find the original casing from the job's allSkills list
      const original = job.allSkills.find((s) => s.toLowerCase() === skill) ?? skill;
      const count = skillCounts.get(original) ?? 0;
      skillCounts.set(original, count + 1);
    }
  }

  // ── Step 2: Merge duplicate casings (e.g., "react" and "React") ──────────
  // Group by lowercase, keep the most common capitalisation
  const mergedCounts = new Map<string, { canonical: string; count: number }>();
  for (const [skill, count] of skillCounts.entries()) {
    const key = skill.toLowerCase();
    const existing = mergedCounts.get(key);
    if (!existing || count > existing.count) {
      mergedCounts.set(key, { canonical: skill, count });
    } else {
      mergedCounts.get(key)!.count += count;
    }
  }

  // ── Step 3: Build frequency list ─────────────────────────────────────────
  const allFrequencies: SkillFrequency[] = Array.from(mergedCounts.values())
    .map(({ canonical, count }) => ({
      skill: canonical,
      count,
      percentage: Math.round((count / totalJobs) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // ── Step 4: Separate skills from tools ───────────────────────────────────
  const topSkills = allFrequencies
    .filter((f) => !isTool(f.skill))
    .slice(0, 10);

  const topTools = allFrequencies
    .filter((f) => isTool(f.skill))
    .slice(0, 10);

  // ── Step 5: Breakdowns ────────────────────────────────────────────────────
  const seniorityBreakdown: Record<string, number> = {};
  const domainBreakdown: Record<string, number> = {};

  for (const job of jobs) {
    seniorityBreakdown[job.seniority] = (seniorityBreakdown[job.seniority] ?? 0) + 1;
    domainBreakdown[job.domain] = (domainBreakdown[job.domain] ?? 0) + 1;
  }

  const report: MarketReport = {
    totalJobs,
    generatedAt: new Date().toISOString(),
    topSkills,
    topTools,
    seniorityBreakdown,
    domainBreakdown,
  };

  // Cache result
  cachedReport = report;
  cacheTimestamp = Date.now();

  return report;
}
