import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { clamp } from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER PATTERN INTELLIGENCE ENGINE
//
// Tracks and surfaces recruiter behavior changes at the company level:
//   - Round count evolution
//   - DSA / System Design / Machine Coding emphasis shifts
//   - Timeline compression or elongation
//   - Ghosting rate changes
//   - Salary compression signals
//   - Hiring velocity (freeze, slow, high)
// ─────────────────────────────────────────────────────────────────────────────

export interface RecruiterTrendReport {
  companyId: string;
  companyName: string;
  slug: string;
  generatedAt: Date;

  // Round evolution
  avgRoundsRecent: number | null;
  avgRoundsHistorical: number | null;
  roundCountTrend: "increasing" | "decreasing" | "stable" | "unknown";

  // Difficulty evolution
  difficultyTrend: "getting_harder" | "getting_easier" | "stable" | "unknown";
  recentDifficultyScore: number | null;
  historicalDifficultyScore: number | null;

  // Timeline evolution
  avgTimelineDaysRecent: number | null;
  avgTimelineDaysHistorical: number | null;
  timelineTrend: "faster" | "slower" | "stable" | "unknown";

  // Hiring velocity
  hiringVelocity: "freeze" | "slow" | "normal" | "high" | "unknown";
  recentContributionCount: number;

  // Round type emphasis
  machineCodingEmphasis: number;   // 0–1 fraction of rounds that are machine coding
  systemDesignEmphasis: number;
  dsaEmphasis: number;
  behavioralEmphasis: number;

  // Ghosting signal
  ghostingRatePct: number | null;

  // Key insight (human-readable summary)
  topInsight: string;
  signals: string[];
  confidence: "high" | "medium" | "low";
}

const DIFFICULTY_SCORE: Record<string, number> = {
  easy: 0.25, medium: 0.50, hard: 0.75, expert: 1.00, unknown: 0.50,
};

const ROUND_TYPE_MAP: Record<string, keyof Pick<RecruiterTrendReport, "machineCodingEmphasis" | "systemDesignEmphasis" | "dsaEmphasis" | "behavioralEmphasis">> = {
  machine_coding: "machineCodingEmphasis",
  system_design:  "systemDesignEmphasis",
  technical:      "dsaEmphasis",
  behavioral:     "behavioralEmphasis",
  hr:             "behavioralEmphasis",
};

function trend(recent: number | null, historical: number | null, threshold = 0.10): "increasing" | "decreasing" | "stable" | "unknown" {
  if (recent == null || historical == null || historical === 0) return "unknown";
  const delta = (recent - historical) / historical;
  if (delta >  threshold) return "increasing";
  if (delta < -threshold) return "decreasing";
  return "stable";
}

function safeMean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export class RecruiterTrendEngine {
  /**
   * Generate a full recruiter trend report for a company.
   * Cached in Redis for 2 hours.
   */
  static async getReport(companyId: string): Promise<RecruiterTrendReport | null> {
    const redis = getRedisClient();
    const cacheKey = `recruiter:trend:${companyId}`;
    const cached = await redis?.get<RecruiterTrendReport>(cacheKey).catch(() => null);
    if (cached) return cached;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true },
    });
    if (!company) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

    const [recentExperiences, historicalExperiences, recruiterPatterns, recentFrequencies, recentContributions] = await Promise.all([
      prisma.interviewExperience.findMany({
        where: { companyId, moderationStatus: "approved", createdAt: { gte: thirtyDaysAgo } },
        include: { rounds: true },
        take: 20,
      }),
      prisma.interviewExperience.findMany({
        where: { companyId, moderationStatus: "approved", createdAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo } },
        include: { rounds: true },
        take: 40,
      }),
      prisma.recruiterPattern.findMany({
        where: { companyId },
        orderBy: { trustScore: "desc" },
        take: 10,
      }),
      prisma.questionFrequency.findMany({
        where: { companyId, updatedAt: { gte: thirtyDaysAgo } },
        include: { question: true },
        take: 50,
      }),
      prisma.interviewContribution.count({
        where: { companyName: company.name, status: "approved", createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Round counts
    const recentRounds  = recentExperiences.map((e) => e.rounds.length);
    const historicalRounds = historicalExperiences.map((e) => e.rounds.length);
    const avgRoundsRecent = safeMean(recentRounds);
    const avgRoundsHistorical = safeMean(historicalRounds);

    // Difficulty scores
    const recentDifficultyScore = safeMean(
      recentFrequencies.map((f) => DIFFICULTY_SCORE[f.question.difficulty] ?? 0.50)
    );
    const historicalDiffScores = await prisma.questionFrequency.findMany({
      where: { companyId, updatedAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo } },
      include: { question: { select: { difficulty: true } } },
      take: 80,
    });
    const historicalDifficultyScore = safeMean(
      historicalDiffScores.map((f) => DIFFICULTY_SCORE[f.question.difficulty] ?? 0.50)
    );

    // Timeline trends
    const recentTimelines = recentExperiences.map((e) => e.timelineDays ?? 0).filter((d) => d > 0);
    const historicalTimelines = historicalExperiences.map((e) => e.timelineDays ?? 0).filter((d) => d > 0);
    const avgTimelineDaysRecent = safeMean(recentTimelines);
    const avgTimelineDaysHistorical = safeMean(historicalTimelines);

    // Round type emphasis
    const allRecentRoundTypes = recentExperiences.flatMap((e) => e.rounds.map((r) => r.type));
    const total = Math.max(allRecentRoundTypes.length, 1);
    const countType = (types: string[]) => allRecentRoundTypes.filter((rt) => types.includes(rt)).length / total;

    const machineCodingEmphasis = countType(["machine_coding"]);
    const systemDesignEmphasis  = countType(["system_design", "lld"]);
    const dsaEmphasis           = countType(["technical", "online_assessment"]);
    const behavioralEmphasis    = countType(["behavioral", "hr", "recruiter_screen"]);

    // Ghosting rate
    const ghostingReports = recruiterPatterns.filter((rp) => (rp.ghostingRate ?? 0) > 0.5);
    const ghostingRatePct = recruiterPatterns.length > 0
      ? Math.round(ghostingReports.length / recruiterPatterns.length * 100)
      : null;

    // Hiring velocity
    const hiringVelocity: RecruiterTrendReport["hiringVelocity"] =
      recentContributions > 10 ? "high" :
      recentContributions > 4  ? "normal" :
      recentContributions > 0  ? "slow" :
      "freeze";

    // Derive trend labels
    const roundCountTrend = trend(avgRoundsRecent, avgRoundsHistorical, 0.15) as RecruiterTrendReport["roundCountTrend"];
    const difficultyTrend: RecruiterTrendReport["difficultyTrend"] =
      recentDifficultyScore != null && historicalDifficultyScore != null
        ? recentDifficultyScore > historicalDifficultyScore + 0.08 ? "getting_harder"
        : recentDifficultyScore < historicalDifficultyScore - 0.08 ? "getting_easier"
        : "stable"
      : "unknown";
    const timelineTrend = trend(avgTimelineDaysRecent, avgTimelineDaysHistorical, 0.10) as RecruiterTrendReport["timelineTrend"];

    // Confidence
    const evidencePoints = recentExperiences.length + historicalExperiences.length;
    const confidence: RecruiterTrendReport["confidence"] =
      evidencePoints >= 10 ? "high" :
      evidencePoints >= 4  ? "medium" : "low";

    // Signals and top insight
    const signals: string[] = [];
    if (difficultyTrend === "getting_harder")    signals.push("⚠️ Interview difficulty increasing recently");
    if (difficultyTrend === "getting_easier")    signals.push("✅ Process appears easier than historical average");
    if (roundCountTrend === "increasing")        signals.push("📈 Round count is rising — prepare for longer process");
    if (roundCountTrend === "decreasing")        signals.push("📉 Process is becoming shorter — faster decisions");
    if (timelineTrend === "slower")              signals.push("🐢 Hiring timeline is elongating — follow up proactively");
    if (timelineTrend === "faster")              signals.push("⚡ Faster offers recently — don't delay if shortlisted");
    if (machineCodingEmphasis > 0.35)            signals.push("💻 Machine Coding is emphasized — practice CLI apps");
    if (systemDesignEmphasis > 0.30)             signals.push("🏗️ System Design is heavily weighted");
    if ((ghostingRatePct ?? 0) > 40)             signals.push("👻 High ghosting rate — follow up after every round");
    if (hiringVelocity === "high")               signals.push("🔥 High hiring activity — apply now");
    if (hiringVelocity === "freeze" || hiringVelocity === "slow") signals.push("🧊 Low hiring activity — explore alternatives");

    const topInsight = signals[0] ?? `${company.name} maintains a ${avgRoundsRecent?.toFixed(0) ?? 4}-round process`;

    const report: RecruiterTrendReport = {
      companyId, companyName: company.name, slug: company.slug, generatedAt: new Date(),
      avgRoundsRecent, avgRoundsHistorical, roundCountTrend,
      difficultyTrend, recentDifficultyScore, historicalDifficultyScore,
      avgTimelineDaysRecent, avgTimelineDaysHistorical, timelineTrend,
      hiringVelocity, recentContributionCount: recentContributions,
      machineCodingEmphasis, systemDesignEmphasis, dsaEmphasis, behavioralEmphasis,
      ghostingRatePct, topInsight, signals, confidence,
    };

    await redis?.set(cacheKey, report, { ex: 2 * 60 * 60 }).catch(() => undefined);
    return report;
  }

  /**
   * Refresh recruiter trends for all active companies.
   * Called by BullMQ daily cron job.
   */
  static async refreshAll(): Promise<{ refreshed: number; failed: number }> {
    const companies = await prisma.company.findMany({
      where: { lastIngestedAt: { gte: new Date(Date.now() - 180 * 86_400_000) } },
      select: { id: true },
      take: 100,
    });

    let refreshed = 0, failed = 0;
    for (const company of companies) {
      try {
        const redis = getRedisClient();
        await redis?.del(`recruiter:trend:${company.id}`).catch(() => undefined);
        await this.getReport(company.id);
        refreshed++;
      } catch {
        failed++;
      }
    }
    return { refreshed, failed };
  }
}
