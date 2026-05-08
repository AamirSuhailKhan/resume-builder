/**
 * ─── Module 4: Skill Gap Engine ───────────────────────────────────────────────
 *
 * Responsibilities (100% deterministic — NO AI):
 *  1. Extract user skills from resume JSON.
 *  2. Compare against top market skills.
 *  3. Compute a weighted match score.
 *  4. Identify matched and missing skills.
 *  5. Produce a human-readable market_insight sentence.
 *  6. Estimate salary using a heuristic rules config.
 *
 * Weighted Scoring:
 *  - Top 3 skills are worth 3× weight
 *  - Ranks 4–7 are worth 2× weight
 *  - Ranks 8–10 are worth 1× weight
 *  Total possible weighted score = sum of weights for top 10.
 */

import { MarketReport, SkillFrequency, SkillGapReport } from "./types";

// ─── Salary Heuristic Config ──────────────────────────────────────────────────
// Add or tweak rules here — no code change elsewhere needed.

interface SalaryRule {
  /** All these skills must be present (case-insensitive) for this rule to apply. */
  requiredSkills: string[];
  min: number;
  max: number;
  currency: "USD" | "INR";
}

const SALARY_RULES: SalaryRule[] = [
  // Full-stack + cloud
  { requiredSkills: ["react", "node.js", "aws"],       min: 1200000, max: 2500000, currency: "INR" },
  { requiredSkills: ["react", "node.js", "gcp"],       min: 1200000, max: 2500000, currency: "INR" },
  { requiredSkills: ["react", "node.js", "azure"],     min: 1100000, max: 2200000, currency: "INR" },
  { requiredSkills: ["next.js", "typescript", "aws"],  min: 1400000, max: 2800000, currency: "INR" },
  // Full-stack without cloud
  { requiredSkills: ["react", "node.js"],              min: 800000,  max: 1800000, currency: "INR" },
  { requiredSkills: ["next.js", "typescript"],         min: 900000,  max: 2000000, currency: "INR" },
  // Frontend only
  { requiredSkills: ["react"],                         min: 600000,  max: 1400000, currency: "INR" },
  { requiredSkills: ["vue.js"],                        min: 500000,  max: 1200000, currency: "INR" },
  { requiredSkills: ["angular"],                       min: 500000,  max: 1200000, currency: "INR" },
  // Backend only
  { requiredSkills: ["node.js"],                       min: 700000,  max: 1600000, currency: "INR" },
  { requiredSkills: ["python"],                        min: 800000,  max: 1800000, currency: "INR" },
  { requiredSkills: ["java"],                          min: 900000,  max: 2000000, currency: "INR" },
  { requiredSkills: ["go"],                            min: 1000000, max: 2200000, currency: "INR" },
  // DevOps
  { requiredSkills: ["kubernetes", "docker", "aws"],   min: 1200000, max: 2500000, currency: "INR" },
  { requiredSkills: ["docker", "aws"],                 min: 900000,  max: 1800000, currency: "INR" },
  // AI / ML
  { requiredSkills: ["python", "tensorflow"],          min: 1200000, max: 2800000, currency: "INR" },
  { requiredSkills: ["python", "pytorch"],             min: 1200000, max: 2800000, currency: "INR" },
  // Generic fallback
  { requiredSkills: ["javascript"],                    min: 400000,  max: 1000000, currency: "INR" },
];

const SALARY_FALLBACK: SalaryRule = {
  requiredSkills: [],
  min: 300000,
  max: 800000,
  currency: "INR",
};

// ─── Weight Table (position → weight) ─────────────────────────────────────────
const POSITION_WEIGHTS = [3, 3, 3, 2, 2, 2, 2, 1, 1, 1]; // index 0 = rank 1

function getWeight(index: number): number {
  return POSITION_WEIGHTS[index] ?? 1;
}

// ─── User Skill Extraction ────────────────────────────────────────────────────

/**
 * Extracts and normalises all skills from a resume JSON blob.
 * Handles multiple common resume shapes.
 */
type ResumeSkillInput = {
  skills?: unknown;
  personal?: {
    summary?: string;
  };
};

export function extractUserSkills(resume: ResumeSkillInput): Set<string> {
  const raw: string[] = [];

  // Top-level skills array
  if (Array.isArray(resume?.skills)) {
    raw.push(...resume.skills.map(String));
  }

  // personal.summary — extract key terms (loose heuristic)
  if (typeof resume?.personal?.summary === "string") {
    // We don't run AI here — rely on explicit skills array only
  }

  // Experience bullet points — skip (too noisy without AI)

  return new Set(raw.map((s) => s.trim().toLowerCase()).filter(Boolean));
}

// ─── Match Score Computation ──────────────────────────────────────────────────

function computeMatchScore(
  userSkillsLower: Set<string>,
  topSkills: SkillFrequency[]
): {
  score: number;
  matched: string[];
  missing: string[];
} {
  let weightedMatched = 0;
  let totalWeight = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  for (let i = 0; i < topSkills.length; i++) {
    const topSkill = topSkills[i];
    if (!topSkill) continue;
    const weight = getWeight(i);
    totalWeight += weight;
    const skillLower = topSkill.skill.toLowerCase();

    if (userSkillsLower.has(skillLower)) {
      weightedMatched += weight;
      matched.push(topSkill.skill);
    } else {
      missing.push(topSkill.skill);
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedMatched / totalWeight) * 100) : 0;
  return { score, matched, missing };
}

// ─── Salary Estimation ────────────────────────────────────────────────────────

function estimateSalary(
  userSkillsLower: Set<string>
): SalaryRule {
  // Evaluate rules in order — return the first match (most specific first)
  for (const rule of SALARY_RULES) {
    const matches = rule.requiredSkills.every((s) => userSkillsLower.has(s.toLowerCase()));
    if (matches) return rule;
  }
  return SALARY_FALLBACK;
}

// ─── Insight Sentence Builder ─────────────────────────────────────────────────

function buildInsight(
  score: number,
  matched: string[],
  missing: string[],
  totalJobs: number
): string {
  const topMissing = missing.slice(0, 3).join(", ");
  const topMatched = matched.slice(0, 3).join(", ");

  if (totalJobs === 0) {
    return "No market data available yet. Analyze some job descriptions to get insights.";
  }

  if (score >= 80) {
    return `Strong match! You have ${matched.length} of the top ${matched.length + missing.length} in-demand skills (${topMatched}). You are well-positioned for ${totalJobs} analyzed roles.`;
  }

  if (score >= 50) {
    return `Good match (${score}%). You cover ${topMatched}, but adding ${topMissing} would significantly increase your shortlist rate across ${totalJobs} relevant jobs.`;
  }

  if (missing.length > 0) {
    return `You need ${topMissing} to match ${score}%+ of ${totalJobs} analyzed roles. Currently ${matched.length} of the top skills are matched.`;
  }

  return `Your profile matches ${score}% of ${totalJobs} analyzed jobs. Add more skills to your resume to improve your score.`;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function computeSkillGap(
  resume: ResumeSkillInput,
  marketReport: MarketReport
): SkillGapReport {
  const userSkillsLower = extractUserSkills(resume);
  const allTopSkills = [...marketReport.topSkills, ...marketReport.topTools];

  const { score, matched, missing } = computeMatchScore(userSkillsLower, allTopSkills);
  const salaryRule = estimateSalary(userSkillsLower);

  return {
    user_match_score: score,
    matched_skills: matched,
    missing_skills: missing,
    market_insight: buildInsight(score, matched, missing, marketReport.totalJobs),
    salary_estimate: {
      min: salaryRule.min,
      max: salaryRule.max,
      currency: salaryRule.currency,
    },
  };
}
