import "server-only";
import { prisma } from "@/lib/db/prisma";
import { clamp } from "./utils";
import { getRedisClient } from "@/lib/redis";

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY INTELLIGENCE SNAPSHOT AGGREGATOR
// 
// This engine rolls up fragmented intelligence (experiences, recruiter signals,
// salaries) into a clean, operational snapshot.
// It answers: "What materially changed?"
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_SCORE: Record<string, number> = {
  easy: 0.25, medium: 0.50, hard: 0.75, expert: 1.00, unknown: 0.50,
};

export class SnapshotAggregatorService {
  /**
   * Generates or updates a snapshot for a company for the given period end date.
   */
  static async generateSnapshot(companyId: string, periodEnd: Date = new Date()) {
    const periodStart = new Date(periodEnd.getTime() - 30 * 86_400_000); // 30-day rolling window
    const baselineStart = new Date(periodEnd.getTime() - 90 * 86_400_000); // 90-day baseline

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) throw new Error("Company not found");

    // 1. Fetch Raw Data
    const [recentExperiences, baselineExperiences, recentQuestions, recruiterPatterns] = await Promise.all([
      prisma.interviewExperience.findMany({
        where: { companyId, moderationStatus: "approved", createdAt: { gte: periodStart, lte: periodEnd } },
        include: { rounds: true },
      }),
      prisma.interviewExperience.findMany({
        where: { companyId, moderationStatus: "approved", createdAt: { gte: baselineStart, lt: periodStart } },
        include: { rounds: true },
      }),
      prisma.questionFrequency.findMany({
        where: { companyId, updatedAt: { gte: periodStart, lte: periodEnd } },
        include: { question: true },
      }),
      prisma.recruiterPattern.findMany({
        where: { companyId },
      }),
    ]);

    const dataPointsCount = recentExperiences.length + recentQuestions.length;

    // If no recent data, carry forward the last snapshot (or return early if none)
    if (dataPointsCount === 0) {
      const lastSnapshot = await prisma.companyIntelligenceSnapshot.findFirst({
        where: { companyId },
        orderBy: { periodEnd: "desc" },
      });
      
      if (!lastSnapshot) return null; // Not enough data to ever generate a snapshot

      // Carry forward but penalize confidence and drop hiring velocity to freeze
      return prisma.companyIntelligenceSnapshot.create({
        data: {
          companyId,
          companyName: company.name,
          periodStart,
          periodEnd,
          hiringVelocity: "freeze",
          avgDifficulty: lastSnapshot.avgDifficulty,
          sysDesignWeight: lastSnapshot.sysDesignWeight,
          dsaWeight: lastSnapshot.dsaWeight,
          avgTimelineDays: lastSnapshot.avgTimelineDays,
          ghostingRate: lastSnapshot.ghostingRate,
          confidenceScore: clamp(lastSnapshot.confidenceScore * 0.8), // decay confidence
          confidenceInterval: [clamp((lastSnapshot.confidenceScore * 0.8) - 0.15), clamp((lastSnapshot.confidenceScore * 0.8) + 0.15)],
          trendStability: "volatile",
          dataPointsCount: 0,
          signals: [],
          trace: {
            reason: "No fresh data in 30 days. Metrics carried forward with confidence decay.",
            dataPoints: 0,
            timeWindow: "30 days",
          },
        },
      });
    }

    // 2. Compute Metrics
    const safeMean = (vals: number[]) => vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    
    // Difficulty
    const avgDifficulty = safeMean(recentQuestions.map(q => DIFFICULTY_SCORE[q.question.difficulty] ?? 0.5));
    const baselineDifficulty = safeMean(
      (await prisma.questionFrequency.findMany({
        where: { companyId, updatedAt: { gte: baselineStart, lt: periodStart } },
        include: { question: true },
      })).map(q => DIFFICULTY_SCORE[q.question.difficulty] ?? 0.5)
    );

    // Timelines
    const recentTimelines = recentExperiences.map(e => e.timelineDays ?? 0).filter(d => d > 0);
    const avgTimelineDays = safeMean(recentTimelines);
    const baselineTimelineDays = safeMean(baselineExperiences.map(e => e.timelineDays ?? 0).filter(d => d > 0));

    // Round Weights
    const allRecentTypes = recentExperiences.flatMap(e => e.rounds.map(r => r.type));
    const sysDesignCount = allRecentTypes.filter(t => t === "system_design" || t === "lld").length;
    const dsaCount = allRecentTypes.filter(t => t === "technical" || t === "online_assessment").length;
    const sysDesignWeight = allRecentTypes.length ? sysDesignCount / allRecentTypes.length : 0;
    const dsaWeight = allRecentTypes.length ? dsaCount / allRecentTypes.length : 0;

    // Recruiter Patterns
    const ghostingRate = safeMean(recruiterPatterns.map(r => r.ghostingRate ?? 0));

    // Hiring Velocity
    let hiringVelocity = "normal";
    if (recentExperiences.length > 15) hiringVelocity = "high";
    else if (recentExperiences.length < 3) hiringVelocity = "slow";

    // 3. Delta Engine (The "What Materially Changed" logic)
    const signals: any[] = [];
    
    if (avgDifficulty > 0 && baselineDifficulty > 0) {
      const diffChange = (avgDifficulty - baselineDifficulty) / baselineDifficulty;
      if (diffChange > 0.15) signals.push({ type: "difficulty_spike", magnitude: diffChange, label: "Interview difficulty increasing" });
      else if (diffChange < -0.15) signals.push({ type: "difficulty_drop", magnitude: diffChange, label: "Interview difficulty easing" });
    }

    if (avgTimelineDays > 0 && baselineTimelineDays > 0) {
      const timeChange = (avgTimelineDays - baselineTimelineDays) / baselineTimelineDays;
      if (timeChange > 0.20) signals.push({ type: "timeline_elongated", magnitude: timeChange, label: "Hiring timelines expanding" });
      else if (timeChange < -0.20) signals.push({ type: "timeline_compressed", magnitude: timeChange, label: "Faster hiring decisions" });
    }

    if (sysDesignWeight > 0.35) {
      signals.push({ type: "high_sysdesign", magnitude: sysDesignWeight, label: "System Design heavily emphasized" });
    }

    // 4. Confidence & Stability
    const volumeScore = clamp(Math.log(dataPointsCount + 1) / Math.log(100)); // 100 data points = 1.0
    // Simplified verification proxy for now (verified experiences)
    const verifiedExperiences = recentExperiences.filter(e => e.trustScore && e.trustScore > 0.7);
    const verificationRatio = recentExperiences.length ? verifiedExperiences.length / recentExperiences.length : 0;
    
    const confidenceScore = clamp((volumeScore * 0.6) + (verificationRatio * 0.4));
    
    // Interval calculation (higher volume = tighter interval)
    const marginOfError = clamp(0.3 / Math.sqrt(Math.max(dataPointsCount, 1)));
    const confidenceInterval = [
      clamp(confidenceScore - marginOfError),
      clamp(confidenceScore + marginOfError)
    ];

    let trendStability = "medium";
    if (dataPointsCount > 20 && marginOfError < 0.1) trendStability = "high";
    else if (dataPointsCount < 5 || marginOfError > 0.2) trendStability = "volatile";

    const trace = {
      dataPoints: dataPointsCount,
      verifiedRatio: verificationRatio,
      timeWindow: "Last 30 days vs 90 day baseline",
      marginOfError,
      volumeScore
    };

    // 5. Persist Snapshot
    const snapshot = await prisma.companyIntelligenceSnapshot.create({
      data: {
        companyId,
        companyName: company.name,
        periodStart,
        periodEnd,
        hiringVelocity,
        avgDifficulty,
        sysDesignWeight,
        dsaWeight,
        avgTimelineDays,
        ghostingRate,
        confidenceScore,
        confidenceInterval,
        trendStability,
        dataPointsCount,
        signals,
        trace,
      }
    });

    // Cache in Redis
    const redis = getRedisClient();
    if (redis) {
      await redis.set(`graph:company:${company.id}:current`, JSON.stringify(snapshot), { ex: 12 * 3600 });
    }

    return snapshot;
  }
}
