/**
 * graph-analytics.service.ts
 * Derives CareerGraphAnalytics from the live graph + raw DB data.
 * Persists a snapshot for historical charting.
 */
import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { GraphService } from "./graph.service";
import type { CareerGraphAnalytics } from "./types";

export class GraphAnalyticsService {
  /**
   * Compute full analytics from graph + supplemental DB tables.
   * Persists a daily snapshot and returns the result.
   */
  static async compute(userId: string): Promise<CareerGraphAnalytics> {
    const [skillNodes, appNodes, offerNodes, gapNodes, goalNodes, salaryNodes, interviewNodes, companyNodes, recruiterNodes] =
      await Promise.all([
        GraphService.getNodesByKind(userId, "SKILL"),
        GraphService.getNodesByKind(userId, "APPLICATION"),
        GraphService.getNodesByKind(userId, "OFFER"),
        GraphService.getNodesByKind(userId, "SKILL_GAP"),
        GraphService.getNodesByKind(userId, "CAREER_GOAL"),
        GraphService.getNodesByKind(userId, "SALARY_TARGET"),
        GraphService.getNodesByKind(userId, "INTERVIEW"),
        GraphService.getNodesByKind(userId, "COMPANY"),
        GraphService.getNodesByKind(userId, "RECRUITER"),
      ]);

    // ── Skill Cloud ─────────────────────────────────────────────────────────
    const gapSkillNames = new Set(
      gapNodes.map((n) => (n.payload as { skill: string }).skill?.toLowerCase())
    );
    const skillCloud = skillNodes.map((n) => {
      const p = n.payload as {
        name: string;
        marketDemand: number;
      };
      return {
        skill: p.name,
        weight: n.weight,
        demand: p.marketDemand ?? 0.5,
        gap: gapSkillNames.has(p.name?.toLowerCase()),
      };
    }).sort((a, b) => b.weight - a.weight).slice(0, 40);

    // ── Application Funnel ───────────────────────────────────────────────────
    const funnel = {
      saved: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      conversionRates: { toInterview: 0, toOffer: 0 },
    };

    // Pull counts from raw DB for accuracy
    const [savedCount, appliedCount, interviewCount, offerCount] = await Promise.all([
      prisma.jobOpportunity.count({ where: { userId } }),
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: "interview" } }),
      prisma.application.count({ where: { userId, status: "offer" } }),
    ]);
    funnel.saved = savedCount;
    funnel.applied = appliedCount;
    funnel.interview = interviewCount;
    funnel.offer = offerCount;
    funnel.conversionRates.toInterview = appliedCount > 0 ? interviewCount / appliedCount : 0;
    funnel.conversionRates.toOffer = appliedCount > 0 ? offerCount / appliedCount : 0;

    // ── Salary Progression ───────────────────────────────────────────────────
    const salaryProgression: CareerGraphAnalytics["salaryProgression"] = [];

    // From offers
    for (const n of offerNodes) {
      const p = n.payload as { baseAmount: number; receivedAt: string; currency: string };
      salaryProgression.push({ date: p.receivedAt, amount: p.baseAmount, type: "offer" });
    }

    // From salary targets
    for (const n of salaryNodes) {
      const p = n.payload as { targetBase: number; currency: string };
      salaryProgression.push({ date: new Date().toISOString(), amount: p.targetBase, type: "target" });
    }

    // Market data from benchmarks
    const benchmarks = await prisma.anonymousBenchmark.findMany({ take: 1 });
    const benchmark = benchmarks[0];
    if (benchmark) {
      salaryProgression.push({
        date: new Date().toISOString(),
        amount: benchmark.avgDaysToOffer * 5000, // approximation
        type: "market",
      });
    }

    salaryProgression.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // ── Skill Gap Heatmap ────────────────────────────────────────────────────
    const skillGapHeatmap = gapNodes.map((n) => {
      const p = n.payload as {
        skill: string;
        currentLevel: number;
        requiredLevel: number;
        priority: number;
      };
      return {
        skill: p.skill,
        current: p.currentLevel,
        required: p.requiredLevel,
        priority: p.priority,
      };
    }).sort((a, b) => b.priority - a.priority).slice(0, 20);

    // ── Career Velocity ──────────────────────────────────────────────────────
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const recentApps = await prisma.application.count({
      where: { userId, createdAt: { gte: fourWeeksAgo } },
    });
    const recentInterviews = await prisma.interviewMockSession.count({
      where: { userId, status: "completed", createdAt: { gte: fourWeeksAgo } },
    });

    const prevMonthApps = await prisma.application.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
          lt: fourWeeksAgo,
        },
      },
    });

    const trend: "accelerating" | "steady" | "slowing" =
      recentApps > prevMonthApps * 1.15
        ? "accelerating"
        : recentApps < prevMonthApps * 0.85
        ? "slowing"
        : "steady";

    const careerVelocity = {
      applicationsPerWeek: recentApps / 4,
      interviewsPerMonth: recentInterviews,
      offersReceived: offerNodes.length,
      trend,
    };

    // ── Network Strength ─────────────────────────────────────────────────────
    const recruiterInteractionCount = await prisma.recruiterInteraction.count({ where: { userId } });
    const avgTrust =
      recruiterNodes.length > 0
        ? recruiterNodes.reduce((s, n) => s + ((n.payload as { trustScore: number }).trustScore ?? 0.5), 0) /
          recruiterNodes.length
        : 0;

    const networkStrength = {
      totalRecruiters: recruiterInteractionCount,
      activeCompanies: companyNodes.length,
      avgRecruiterTrustScore: parseFloat(avgTrust.toFixed(2)),
    };

    // ── Goal Progress ────────────────────────────────────────────────────────
    const goalProgress = goalNodes.map((n) => {
      const p = n.payload as { targetRole: string; status: string };
      return {
        goal: p.targetRole,
        progress: n.weight * 100,
        status: p.status ?? "active",
      };
    });

    const analytics: CareerGraphAnalytics = {
      skillCloud,
      applicationFunnel: funnel,
      salaryProgression,
      skillGapHeatmap,
      careerVelocity,
      networkStrength,
      goalProgress,
    };

    // Persist daily snapshot
    await this._persistSnapshot(userId, analytics);

    return analytics;
  }

  /**
   * Get historical snapshots for trend charting (last N days).
   */
  static async getHistory(userId: string, days = 30): Promise<
    Array<{ date: string; completenessScore: number; nodeCount: number; edgeCount: number }>
  > {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const snapshots = await prisma.careerGraphSnapshot.findMany({
      where: { userId, snapshotDate: { gte: cutoff } },
      orderBy: { snapshotDate: "asc" },
    });

    return snapshots.map((s) => ({
      date: s.snapshotDate.toISOString(),
      completenessScore: s.completenessScore,
      nodeCount: s.nodeCount,
      edgeCount: s.edgeCount,
    }));
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private static async _persistSnapshot(
    userId: string,
    analytics: CareerGraphAnalytics
  ): Promise<void> {
    try {
      const meta = await prisma.careerGraphMeta.findUnique({ where: { userId } });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.careerGraphSnapshot.upsert({
        where: { userId_snapshotDate: { userId, snapshotDate: today } },
        create: {
          userId,
          snapshotDate: today,
          graphVersion: meta?.graphVersion ?? 0,
          analytics: analytics as object,
          completenessScore: meta?.completenessScore ?? 0,
          nodeCount: meta?.totalNodes ?? 0,
          edgeCount: meta?.totalEdges ?? 0,
        },
        update: {
          analytics: analytics as object,
          completenessScore: meta?.completenessScore ?? 0,
          nodeCount: meta?.totalNodes ?? 0,
          edgeCount: meta?.totalEdges ?? 0,
        },
      });
    } catch (err) {
      logger.warn({ userId, err }, "[GraphAnalyticsService] Failed to persist snapshot");
    }
  }
}
