/**
 * ─── Job Intelligence Engine: Shared Types ────────────────────────────────────
 *
 * Strict TypeScript types shared across all 4 modules:
 *   1. JD Parser     → ParsedJob
 *   2. Job Aggregator → AggregatedJob[]
 *   3. Market Analyzer → MarketReport
 *   4. Skill Gap Engine → SkillGapReport
 */

// ─── Raw JD Parser Output ─────────────────────────────────────────────────────

export interface ParsedJob {
  /** Stable ID — SHA-256 hash of the raw JD text (deduplication key). */
  id: string;
  /** ISO timestamp of when this JD was parsed. */
  parsedAt: string;
  /** Original raw text supplied by the caller. */
  rawText: string;
  required_skills: string[];
  optional_skills: string[];
  tools: string[];
  keywords: string[];
  responsibilities: string[];
  seniority: "Junior" | "Mid" | "Senior" | "Lead" | "Unknown";
  domain: string;
}

// ─── Aggregator Storage Record ────────────────────────────────────────────────

export interface AggregatedJob {
  id: string;
  parsedAt: string;
  /** Merged deduplicated list of all skills (required + optional + tools). */
  allSkills: string[];
  seniority: string;
  domain: string;
}

// ─── Market Analyzer Report ───────────────────────────────────────────────────

export interface SkillFrequency {
  skill: string;
  /** Count of jobs that mention this skill. */
  count: number;
  /** Percentage of total jobs that mention this skill. */
  percentage: number;
}

export interface MarketReport {
  totalJobs: number;
  generatedAt: string;
  topSkills: SkillFrequency[];   // Top 10 across all jobs
  topTools: SkillFrequency[];    // Tools / platforms only
  seniorityBreakdown: Record<string, number>;
  domainBreakdown: Record<string, number>;
}

// ─── Skill Gap Engine Report ──────────────────────────────────────────────────

export interface SkillGapReport {
  /** 0–100, weighted match against top market skills. */
  user_match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  market_insight: string;
  salary_estimate: {
    min: number;
    max: number;
    currency: "USD" | "INR";
  };
}

// ─── Combined Final Output ────────────────────────────────────────────────────

export interface JobIntelligenceOutput {
  top_skills: string[];
  top_tools: string[];
  demand_frequency: Record<string, number>;
  user_match_score: number;
  missing_skills: string[];
  market_insight: string;
  salary_estimate: {
    min: number;
    max: number;
    currency: "USD" | "INR";
  };
}
