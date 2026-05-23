import "server-only";
import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// RECENCY DECAY SERVICE
// Prevents stale data from dominating rankings.
// Run daily via a cron job or BullMQ scheduled worker.
// ─────────────────────────────────────────────────────────────────────────────

// Exponential decay: f(t) = e^(-λ * t)
// λ = 0.03 → half-life ~23 days (questions seen >3 weeks ago lose significant weight)
// λ = 0.008 → half-life ~87 days (softer decay for salary/trend data)
const QUESTION_DECAY_LAMBDA = 0.03;
const SALARY_DECAY_LAMBDA = 0.008;
const EXPERIENCE_DECAY_LAMBDA = 0.012;

function exponentialDecay(daysSince: number, lambda: number): number {
  return Math.max(0.05, Math.exp(-lambda * daysSince));
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export class RecencyDecayService {
  /**
   * Decay freshnessScore on InterviewQuestion records.
   * Should run daily. Processes in batches to avoid timeouts.
   */
  static async decayQuestions(batchSize = 500): Promise<{ updated: number }> {
    let cursor: string | undefined;
    let updated = 0;

    while (true) {
      const questions = await prisma.interviewQuestion.findMany({
        where: {
          moderationStatus: "approved",
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: { id: true, lastSeenAt: true, freshnessScore: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });

      if (questions.length === 0) break;

      for (const q of questions) {
        const days = daysSince(q.lastSeenAt);
        const newFreshness = exponentialDecay(days, QUESTION_DECAY_LAMBDA);

        // Only write if there is a meaningful change (> 0.01 delta)
        if (Math.abs(newFreshness - q.freshnessScore) > 0.01) {
          await prisma.interviewQuestion.update({
            where: { id: q.id },
            data: { freshnessScore: newFreshness },
          });
          updated++;
        }
      }

      cursor = questions[questions.length - 1]?.id;
      if (questions.length < batchSize) break;
    }

    return { updated };
  }

  /**
   * Decay recencyScore on InterviewExperience records.
   */
  static async decayExperiences(batchSize = 200): Promise<{ updated: number }> {
    let cursor: string | undefined;
    let updated = 0;

    while (true) {
      const experiences = await prisma.interviewExperience.findMany({
        where: {
          moderationStatus: "approved",
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: { id: true, createdAt: true, occurredAt: true, recencyScore: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });

      if (experiences.length === 0) break;

      for (const exp of experiences) {
        const referenceDate = exp.occurredAt ?? exp.createdAt;
        const days = daysSince(referenceDate);
        const newRecency = exponentialDecay(days, EXPERIENCE_DECAY_LAMBDA);

        if (Math.abs(newRecency - exp.recencyScore) > 0.01) {
          await prisma.interviewExperience.update({
            where: { id: exp.id },
            data: { recencyScore: newRecency },
          });
          updated++;
        }
      }

      cursor = experiences[experiences.length - 1]?.id;
      if (experiences.length < batchSize) break;
    }

    return { updated };
  }

  /**
   * Decay confidence on SalaryInsight records.
   * Salary data older than 12 months should be significantly discounted.
   */
  static async decaySalaryInsights(batchSize = 200): Promise<{ updated: number }> {
    let cursor: string | undefined;
    let updated = 0;

    while (true) {
      const insights = await prisma.salaryInsight.findMany({
        where: { ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true, lastObservedAt: true, confidence: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });

      if (insights.length === 0) break;

      for (const insight of insights) {
        const days = daysSince(insight.lastObservedAt);
        const newConfidence = exponentialDecay(days, SALARY_DECAY_LAMBDA);

        if (Math.abs(newConfidence - insight.confidence) > 0.01) {
          await prisma.salaryInsight.update({
            where: { id: insight.id },
            data: { confidence: newConfidence },
          });
          updated++;
        }
      }

      cursor = insights[insights.length - 1]?.id;
      if (insights.length < batchSize) break;
    }

    return { updated };
  }

  /**
   * Decay trendScore on QuestionFrequency records.
   * trendScore represents "recency-weighted demand" — it should decay
   * if the question hasn't been reported recently.
   */
  static async decayFrequencyTrends(batchSize = 500): Promise<{ updated: number }> {
    let cursor: string | undefined;
    let updated = 0;

    while (true) {
      const freqs = await prisma.questionFrequency.findMany({
        where: { ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true, lastAskedAt: true, trendScore: true },
        orderBy: { id: "asc" },
        take: batchSize,
      });

      if (freqs.length === 0) break;

      for (const freq of freqs) {
        if (!freq.lastAskedAt) continue;
        const days = daysSince(freq.lastAskedAt);
        // More aggressive decay for trend: lambda = 0.05 (~14 day half-life)
        const newTrend = exponentialDecay(days, 0.05) * freq.trendScore;

        if (Math.abs(newTrend - freq.trendScore) > 0.005) {
          await prisma.questionFrequency.update({
            where: { id: freq.id },
            data: { trendScore: newTrend },
          });
          updated++;
        }
      }

      cursor = freqs[freqs.length - 1]?.id;
      if (freqs.length < batchSize) break;
    }

    return { updated };
  }

  /**
   * Flag stale companies (not updated in 90+ days) for re-ingestion.
   */
  static async flagStaleCompanies(): Promise<string[]> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const stale = await prisma.company.findMany({
      where: {
        OR: [
          { lastIngestedAt: { lt: cutoff } },
          { lastIngestedAt: null },
        ],
      },
      select: { id: true, name: true },
      take: 20,
    });

    // Reduce trust score for companies with stale data
    for (const company of stale) {
      await prisma.company.update({
        where: { id: company.id },
        data: { trustScore: { decrement: 0.05 } },
      });
    }

    return stale.map((c) => c.name);
  }

  /**
   * Master runner — call all decay functions in sequence.
   * Designed to be called from a BullMQ scheduled job.
   */
  static async runFullDecayCycle(): Promise<{
    questions: number;
    experiences: number;
    salaries: number;
    frequencies: number;
    staleCompanies: string[];
  }> {
    const [questions, experiences, salaries, frequencies, staleCompanies] = await Promise.all([
      this.decayQuestions(),
      this.decayExperiences(),
      this.decaySalaryInsights(),
      this.decayFrequencyTrends(),
      this.flagStaleCompanies(),
    ]);

    return {
      questions: questions.updated,
      experiences: experiences.updated,
      salaries: salaries.updated,
      frequencies: frequencies.updated,
      staleCompanies,
    };
  }
}
