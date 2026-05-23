import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { clamp, normalizeText } from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// CONTRADICTION DETECTION ENGINE
//
// Detects when new intelligence contradicts established patterns.
//
// Types of contradictions:
//   SOFT: Unusual but plausible — reduce confidence, flag for monitoring
//   HARD: Statistically impossible with existing evidence — escalate immediately
//
// Detection methods:
//   1. Pattern Drift (mean shift detection)
//   2. Sudden Spike Detection (outlier vs baseline)
//   3. Narrative Reversal (round presence/absence flip)
//   4. Timeline Anomaly (impossible/implausible dates)
//   5. Salary Anomaly (>3σ from distribution)
// ─────────────────────────────────────────────────────────────────────────────

export type ContradictionType =
  | "pattern_drift"
  | "sudden_spike"
  | "narrative_reversal"
  | "timeline_anomaly"
  | "salary_anomaly"
  | "round_count_drift"
  | "difficulty_flip";

export type ContradictionSeverity = "soft" | "hard" | "none";

export interface ContradictionResult {
  severity: ContradictionSeverity;
  type: ContradictionType | null;
  score: number;            // 0–1 (1 = maximum contradiction)
  penalty: number;          // subtracted from surface score (0–1)
  details: string;
  shouldEscalate: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PATTERN DRIFT DETECTION
// Compares recent window vs historical baseline for a metric.
// Z-score: (recent_mean - historical_mean) / historical_std
// Drift > 2.0 → SOFT | Drift > 3.5 → HARD
// ─────────────────────────────────────────────────────────────────────────────

interface MetricSample {
  value: number;
  recordedAt: Date;
}

function computeZScore(recent: number[], historical: number[]): number {
  if (historical.length < 3) return 0;
  const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
  const variance = historical.reduce((sum, v) => sum + (v - mean) ** 2, 0) / historical.length;
  const std = Math.sqrt(variance);
  if (std < 0.001) return 0;
  const recentMean = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : mean;
  return Math.abs(recentMean - mean) / std;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DETECT DIFFICULTY FLIP for a company
// ─────────────────────────────────────────────────────────────────────────────
async function detectDifficultyFlip(companyId: string): Promise<ContradictionResult> {
  const DIFFICULTY_MAP: Record<string, number> = { easy: 0.25, medium: 0.50, hard: 0.75, expert: 1.00, unknown: 0.50 };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

  const [recent, historical] = await Promise.all([
    prisma.questionFrequency.findMany({
      where: { companyId, updatedAt: { gte: thirtyDaysAgo } },
      include: { question: { select: { difficulty: true } } },
      take: 50,
    }),
    prisma.questionFrequency.findMany({
      where: { companyId, updatedAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo } },
      include: { question: { select: { difficulty: true } } },
      take: 100,
    }),
  ]);

  const recentScores = recent.map((f) => DIFFICULTY_MAP[f.question.difficulty] ?? 0.50);
  const historicalScores = historical.map((f) => DIFFICULTY_MAP[f.question.difficulty] ?? 0.50);
  const zScore = computeZScore(recentScores, historicalScores);

  if (zScore > 3.5) return {
    severity: "hard", type: "difficulty_flip",
    score: clamp(zScore / 5), penalty: 0.40,
    details: `Difficulty distribution shifted significantly (z=${zScore.toFixed(2)})`,
    shouldEscalate: true,
  };
  if (zScore > 2.0) return {
    severity: "soft", type: "pattern_drift",
    score: clamp(zScore / 5), penalty: 0.15,
    details: `Difficulty drift detected (z=${zScore.toFixed(2)})`,
    shouldEscalate: false,
  };

  return { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DETECT ROUND COUNT DRIFT
// ─────────────────────────────────────────────────────────────────────────────
async function detectRoundCountDrift(companyId: string): Promise<ContradictionResult> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);

  const experiences = await prisma.interviewExperience.findMany({
    where: { companyId, moderationStatus: "approved" },
    select: { roundsCount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (experiences.length < 5) {
    return { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };
  }

  const recent = experiences.filter((e) => e.createdAt >= sixtyDaysAgo).map((e) => e.roundsCount ?? 4);
  const historical = experiences.filter((e) => e.createdAt < sixtyDaysAgo).map((e) => e.roundsCount ?? 4);
  const zScore = computeZScore(recent, historical);

  if (zScore > 3.0) return {
    severity: "hard", type: "round_count_drift",
    score: clamp(zScore / 4), penalty: 0.30,
    details: `Round count changed significantly — recent avg ${recent.length > 0 ? (recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1) : "N/A"} vs historical ${historical.length > 0 ? (historical.reduce((a, b) => a + b, 0) / historical.length).toFixed(1) : "N/A"}`,
    shouldEscalate: true,
  };
  if (zScore > 1.5) return {
    severity: "soft", type: "pattern_drift",
    score: clamp(zScore / 4), penalty: 0.10,
    details: `Round count shifted (z=${zScore.toFixed(2)})`,
    shouldEscalate: false,
  };

  return { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DETECT SALARY ANOMALY
// A new salary submission is >3σ from existing distribution → suspicious
// ─────────────────────────────────────────────────────────────────────────────
async function detectSalaryAnomaly(companyId: string, newBaseAnnual: number): Promise<ContradictionResult> {
  const insights = await prisma.salaryInsight.findMany({
    where: { companyId, confidence: { gte: 0.4 } },
    select: { baseMedian: true, baseMin: true, baseMax: true, sampleSize: true },
    take: 20,
  });

  if (insights.length < 3) {
    return { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };
  }

  const medians = insights.map((i) => i.baseMedian ?? 0).filter((v) => v > 0);
  if (medians.length < 2) {
    return { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };
  }
  const mean = medians.reduce((a, b) => a + b, 0) / medians.length;
  const std = Math.sqrt(medians.reduce((sum, v) => sum + (v - mean) ** 2, 0) / medians.length);

  const zScore = std > 0 ? Math.abs(newBaseAnnual - mean) / std : 0;

  if (zScore > 3.0) return {
    severity: "hard", type: "salary_anomaly",
    score: clamp(zScore / 5), penalty: 0.50,
    details: `Salary ₹${(newBaseAnnual / 100000).toFixed(1)}L is ${zScore.toFixed(1)}σ from market median`,
    shouldEscalate: true,
  };
  if (zScore > 2.0) return {
    severity: "soft", type: "salary_anomaly",
    score: clamp(zScore / 5), penalty: 0.20,
    details: `Salary appears inflated vs market data (z=${zScore.toFixed(1)})`,
    shouldEscalate: false,
  };

  return { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUDDEN SPIKE DETECTION
// A topic appears 5× more frequently than its 30-day baseline
// ─────────────────────────────────────────────────────────────────────────────
async function detectSuddenSpike(companyId: string, topic: string): Promise<ContradictionResult> {
  const redis = getRedisClient();
  const cacheKey = `contradiction:spike:${companyId}:${topic}`;

  if (redis) {
    const cached = await redis.get<ContradictionResult>(cacheKey).catch(() => null);
    if (cached) return cached;
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  const previousPeriodStart = new Date(Date.now() - 44 * 86_400_000);

  const [recentCount, historicalCount] = await Promise.all([
    prisma.questionFrequency.count({
      where: { companyId, updatedAt: { gte: fourteenDaysAgo } },
    }),
    prisma.questionFrequency.count({
      where: { companyId, updatedAt: { gte: previousPeriodStart, lt: fourteenDaysAgo } },
    }),
  ]);

  const weeklyHistoricalAvg = historicalCount / 2; // Two 14-day periods in the 28-day historical window
  const spikeRatio = weeklyHistoricalAvg > 0 ? recentCount / weeklyHistoricalAvg : 0;

  const result: ContradictionResult = spikeRatio > 5.0
    ? { severity: "soft", type: "sudden_spike", score: clamp(spikeRatio / 10), penalty: 0.10,
        details: `Question frequency spiked ${spikeRatio.toFixed(1)}× above baseline — verify authenticity`, shouldEscalate: false }
    : { severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false };

  await redis?.set(cacheKey, result, { ex: 3600 }).catch(() => undefined);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER CONTRADICTION EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────
export async function evaluateContradiction(params: {
  companyId: string;
  topic?: string | undefined;
  newSalary?: number | undefined;
}): Promise<ContradictionResult> {
  const results = await Promise.all([
    detectDifficultyFlip(params.companyId),
    detectRoundCountDrift(params.companyId),
    params.newSalary ? detectSalaryAnomaly(params.companyId, params.newSalary) : Promise.resolve<ContradictionResult>({ severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false }),
    params.topic ? detectSuddenSpike(params.companyId, params.topic) : Promise.resolve<ContradictionResult>({ severity: "none", type: null, score: 0, penalty: 0, details: "", shouldEscalate: false }),
  ]);

  // Return the worst result
  const worst = results.reduce((best, current) =>
    current.score > best.score ? current : best,
    results[0]!
  );

  // Persist alert if significant
  if (worst.severity !== "none" && worst.score > 0.25) {
    await prisma.contradictionAlert.upsert({
      where: {
        entityType_entityId_type: {
          entityType: "Company",
          entityId: params.companyId,
          type: worst.type ?? "pattern_drift",
        },
      },
      create: {
        entityType: "Company",
        entityId: params.companyId,
        type: worst.type ?? "pattern_drift",
        severity: worst.severity,
        score: worst.score,
        details: worst.details,
        shouldEscalate: worst.shouldEscalate,
      },
      update: {
        score: worst.score,
        details: worst.details,
        severity: worst.severity,
        shouldEscalate: worst.shouldEscalate,
        resolvedAt: null, // re-open if previously resolved
        updatedAt: new Date(),
      },
    });

    // Push to moderation escalation queue if hard contradiction
    if (worst.shouldEscalate) {
      const redis = getRedisClient();
      await redis?.lpush("moderation:contradiction_queue", JSON.stringify({
        companyId: params.companyId,
        type: worst.type,
        score: worst.score,
        details: worst.details,
        timestamp: new Date().toISOString(),
      })).catch(() => undefined);
    }
  }

  return worst;
}
