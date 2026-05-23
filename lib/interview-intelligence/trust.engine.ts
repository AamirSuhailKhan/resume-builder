import "server-only";
import { prisma } from "@/lib/db/prisma";
import { clamp } from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// TRUST SCORE ENGINE
//
// Every intelligence surface must be explainable.
// Formula:
//   TrustScore =
//     VerificationWeight × 0.35
//     + PeerCorroboration  × 0.25
//     + HistoricalAccuracy × 0.20
//     + RecencyFactor      × 0.12
//     + CompletenessScore  × 0.08
// ─────────────────────────────────────────────────────────────────────────────

const VERIFICATION_WEIGHTS: Record<number, number> = {
  0: 0.30, // Unverified
  1: 0.65, // Email verified
  2: 0.85, // Document hash
  3: 1.00, // Peer corroborated
};

export interface TrustBreakdown {
  total: number;           // 0–1
  verification: number;
  peerCorroboration: number;
  historicalAccuracy: number;
  recency: number;
  completeness: number;
  explanation: string;
  confidence: "high" | "medium" | "low" | "uncertain";
}

export interface SurfaceScore {
  total: number;           // 0–1 — final ranking weight
  trust: number;
  frequency: number;
  freshness: number;
  contradictionPenalty: number;
  explanation: string;
}

function recencyFactor(occurredAt: Date | null | undefined): number {
  if (!occurredAt) return 0.50;
  const days = Math.max(0, (Date.now() - new Date(occurredAt).getTime()) / 86_400_000);
  return clamp(Math.exp(-0.012 * days));
}

function completenessScore(payload: Record<string, unknown>, requiredKeys: string[]): number {
  const filled = requiredKeys.filter((k) => payload[k] !== undefined && payload[k] !== null && payload[k] !== "");
  return clamp(filled.length / Math.max(requiredKeys.length, 1));
}

function confidenceLabel(score: number): "high" | "medium" | "low" | "uncertain" {
  if (score >= 0.75) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.35) return "low";
  return "uncertain";
}

function buildTrustExplanation(breakdown: Omit<TrustBreakdown, "explanation" | "confidence">): string {
  const parts: string[] = [];
  if (breakdown.verification >= 0.80) parts.push("verified by company email or document");
  else if (breakdown.verification >= 0.60) parts.push("email-verified contributor");
  else parts.push("unverified submission");

  if (breakdown.peerCorroboration >= 0.70) parts.push("corroborated by peers");
  if (breakdown.recency >= 0.80) parts.push("recent (within 30 days)");
  else if (breakdown.recency < 0.40) parts.push("older report (>90 days)");
  if (breakdown.historicalAccuracy >= 0.75) parts.push("from reliable contributor");
  return parts.join(", ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute trust score for a single InterviewContribution
// ─────────────────────────────────────────────────────────────────────────────
export async function computeContributionTrust(contributionId: string): Promise<TrustBreakdown> {
  const contribution = await prisma.interviewContribution.findUnique({
    where: { id: contributionId },
    select: {
      verificationTier: true,
      upvoteCount: true,
      downvoteCount: true,
      payload: true,
      type: true,
      userId: true,
      createdAt: true,
    },
  });
  if (!contribution) throw new Error("Contribution not found");

  const rep = await prisma.contributorReputation.findUnique({
    where: { userId: contribution.userId },
    select: { trustScore: true },
  });

  const tier = Math.min(3, Math.max(0, contribution.verificationTier ?? 0)) as 0 | 1 | 2 | 3;
  const verification = VERIFICATION_WEIGHTS[tier] ?? 0.30;
  const upvotes = contribution.upvoteCount ?? 0;
  const downvotes = contribution.downvoteCount ?? 0;
  const peerCorroboration = clamp(upvotes / (upvotes + downvotes + 1));
  const historicalAccuracy = clamp(rep?.trustScore ?? 0.40);
  const recency = recencyFactor(contribution.createdAt);

  const payload = (contribution.payload as Record<string, unknown>) ?? {};
  const requiredKeys = REQUIRED_PAYLOAD_KEYS[contribution.type] ?? [];
  const completeness = completenessScore(payload, requiredKeys);

  const total = clamp(
    verification   * 0.35 +
    peerCorroboration * 0.25 +
    historicalAccuracy * 0.20 +
    recency           * 0.12 +
    completeness      * 0.08
  );

  const breakdown = { total, verification, peerCorroboration, historicalAccuracy, recency, completeness };
  return {
    ...breakdown,
    explanation: buildTrustExplanation(breakdown),
    confidence: confidenceLabel(total),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute surface score for ranking in search results
// ─────────────────────────────────────────────────────────────────────────────
export async function computeSurfaceScore(params: {
  questionId: string;
  companyId?: string | undefined;
  contradictionPenalty?: number | undefined;
}): Promise<SurfaceScore> {
  const question = await prisma.interviewQuestion.findUnique({
    where: { id: params.questionId },
    select: {
      popularityScore: true,
      freshnessScore: true,
      ...(params.companyId ? { frequencies: { where: { companyId: params.companyId }, select: { frequencyScore: true, trendScore: true }, take: 1 } } : {}),
    },
  });
  if (!question) throw new Error("Question not found");

  // Aggregate trust from contributions linked to this question
  const contributions = await prisma.interviewContribution.findMany({
    where: { questionId: params.questionId, status: "approved" },
    select: { verificationTier: true, upvoteCount: true, downvoteCount: true, userId: true },
  });

  let trustSum = 0;
  for (const c of contributions) {
    const tier = Math.min(3, Math.max(0, c.verificationTier ?? 0)) as 0 | 1 | 2 | 3;
    const v = VERIFICATION_WEIGHTS[tier] ?? 0.30;
    const p = clamp((c.upvoteCount ?? 0) / ((c.upvoteCount ?? 0) + (c.downvoteCount ?? 0) + 1));
    trustSum += (v * 0.6 + p * 0.4);
  }
  const trust = clamp(contributions.length > 0 ? trustSum / contributions.length : 0.35);

  const freq = question.frequencies?.[0];
  const frequency = clamp((freq?.frequencyScore ?? question.popularityScore) / 2);
  const freshness = question.freshnessScore;
  const contradictionPenalty = clamp(params.contradictionPenalty ?? 0);

  const total = clamp(
    trust     * 0.40 +
    frequency * 0.25 +
    freshness * 0.20 -
    contradictionPenalty * 0.15
  );

  return {
    total,
    trust,
    frequency,
    freshness,
    contradictionPenalty,
    explanation: `Trust: ${(trust * 100).toFixed(0)}% | Frequency: ${(frequency * 100).toFixed(0)}% | Freshness: ${(freshness * 100).toFixed(0)}%${contradictionPenalty > 0.1 ? ` | Contradiction penalty: -${(contradictionPenalty * 100).toFixed(0)}%` : ""}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate company-level intelligence confidence
// (used on company pages to show "X% confident" signal)
// ─────────────────────────────────────────────────────────────────────────────
export async function computeCompanyConfidence(companyId: string): Promise<{
  score: number;
  label: "high" | "medium" | "low" | "uncertain";
  contributionCount: number;
  verifiedCount: number;
  freshReportCount: number;
  explanation: string;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [totalContributions, verifiedContributions, freshContributions, questionCount] = await Promise.all([
    prisma.interviewContribution.count({ where: { companyName: { contains: companyId }, status: "approved" } }),
    prisma.interviewContribution.count({ where: { companyName: { contains: companyId }, status: "approved", verificationTier: { gte: 1 } } }),
    prisma.interviewContribution.count({ where: { companyName: { contains: companyId }, status: "approved", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.questionFrequency.count({ where: { companyId } }),
  ]);

  const verificationRatio = totalContributions > 0 ? verifiedContributions / totalContributions : 0;
  const freshnessRatio = totalContributions > 0 ? freshContributions / Math.max(totalContributions, 10) : 0;
  const volumeScore = clamp(Math.log(Math.max(totalContributions + 1, 1)) / Math.log(100));
  const questionScore = clamp(questionCount / 50);

  const score = clamp(
    verificationRatio * 0.35 +
    freshnessRatio    * 0.25 +
    volumeScore       * 0.25 +
    questionScore     * 0.15
  );

  const parts: string[] = [];
  if (verifiedContributions > 0) parts.push(`${verifiedContributions} verified reports`);
  if (freshContributions > 0) parts.push(`${freshContributions} reports in last 30 days`);
  parts.push(`${questionCount} tracked questions`);

  return {
    score,
    label: confidenceLabel(score),
    contributionCount: totalContributions,
    verifiedCount: verifiedContributions,
    freshReportCount: freshContributions,
    explanation: parts.join(" · "),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_PAYLOAD_KEYS: Record<string, string[]> = {
  experience:        ["outcome", "overallDifficulty", "rounds"],
  question:          ["question", "type", "difficulty"],
  salary:            ["baseAnnual", "totalCtc", "currency"],
  recruiter_pattern: ["responseRatePct", "avgResponseDays"],
  correction:        ["field", "correctedValue", "reason"],
};
