import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";

// ─────────────────────────────────────────────────────────────────────────────
// GAMIFICATION SERVICE
// Points, badges, leaderboards, and streaks for the contribution flywheel.
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeSlug =
  | "first_contribution"   // 1 accepted contribution
  | "trusted_contributor"  // 5 accepted + trust > 0.7
  | "verified_insider"     // company email verified
  | "intel_expert"         // 20+ accepted contributions
  | "streak_7"             // 7 consecutive days
  | "streak_30"            // 30 consecutive days
  | "salary_sharer"        // 3+ salary submissions accepted
  | "experience_reporter"  // 3+ experience submissions accepted
  | "recruiter_tracker";   // 3+ recruiter pattern submissions

interface PointEvent {
  userId: string;
  points: number;
  reason: string;
  entityId?: string;
}

const BADGE_CRITERIA: Record<BadgeSlug, {
  label: string;
  description: string;
  points: number;
  benefit: string;
}> = {
  first_contribution: {
    label: "🌱 First Contribution",
    description: "Submitted your first accepted interview experience",
    points: 100,
    benefit: "Unlock full company report for 7 days",
  },
  trusted_contributor: {
    label: "⭐ Trusted Contributor",
    description: "5 accepted contributions with trust score ≥ 0.7",
    points: 500,
    benefit: "Priority ranking in search, 2× vote weight",
  },
  verified_insider: {
    label: "🔐 Verified Insider",
    description: "Verified via company email address",
    points: 300,
    benefit: "Gold badge, 2× vote weight, unlock salary intelligence",
  },
  intel_expert: {
    label: "🏆 Intel Expert",
    description: "20+ accepted contributions",
    points: 2000,
    benefit: "Free Pro access for 3 months",
  },
  streak_7: {
    label: "🔥 7-Day Streak",
    description: "Contributed 7 days in a row",
    points: 200,
    benefit: "Unlock mock interview premium mode",
  },
  streak_30: {
    label: "💎 30-Day Streak",
    description: "Contributed 30 days in a row",
    points: 1000,
    benefit: "Free Pro for 1 month + leaderboard highlight",
  },
  salary_sharer: {
    label: "💰 Salary Sharer",
    description: "3+ accepted salary submissions",
    points: 400,
    benefit: "Unlock detailed salary percentiles",
  },
  experience_reporter: {
    label: "📝 Experience Reporter",
    description: "3+ detailed interview experiences accepted",
    points: 600,
    benefit: "Unlock all experience reports for target company",
  },
  recruiter_tracker: {
    label: "🎯 Recruiter Tracker",
    description: "3+ recruiter pattern submissions accepted",
    points: 350,
    benefit: "Unlock recruiter intelligence for all companies",
  },
};

// Points awarded per contribution type and outcome
const POINT_EVENTS = {
  contribution_accepted_question: 50,
  contribution_accepted_experience: 100,
  contribution_accepted_salary: 75,
  contribution_accepted_recruiter_pattern: 60,
  contribution_accepted_correction: 30,
  contribution_rejected: -20,
  vote_helpful_received: 10,
  vote_not_helpful_received: -5,
  peer_corroboration_achieved: 150,
  email_verification: 200,
  document_verification: 300,
  streak_day: 15,
};

export class GamificationService {
  /**
   * Award points for a contribution outcome.
   * Called by the contribution service after moderation.
   */
  static async awardContributionPoints(
    userId: string,
    type: string,
    status: "approved" | "rejected"
  ) {
    const baseKey = `contribution_${status === "approved" ? "accepted" : "rejected"}_${type}` as keyof typeof POINT_EVENTS;
    const points = POINT_EVENTS[baseKey] ?? (status === "approved" ? 40 : -20);
    await this.addPoints({ userId, points, reason: `Contribution ${status}: ${type}` });
    await this.checkAndAwardBadges(userId);
  }

  /**
   * Award points for receiving an upvote.
   */
  static async awardVotePoints(contributorUserId: string, helpful: boolean) {
    const points = helpful ? POINT_EVENTS.vote_helpful_received : POINT_EVENTS.vote_not_helpful_received;
    await this.addPoints({
      userId: contributorUserId,
      points,
      reason: helpful ? "Contribution marked helpful by community" : "Contribution marked not helpful",
    });
  }

  /**
   * Award streak bonus. Called daily by the cron job.
   */
  static async updateStreak(userId: string) {
    const rep = await prisma.contributorReputation.findUnique({
      where: { userId },
      select: { currentStreak: true, lastContributionAt: true },
    });
    if (!rep) return;

    const now = new Date();
    const lastDay = rep.lastContributionAt ? new Date(rep.lastContributionAt) : null;
    const hoursSinceLastContribution = lastDay
      ? (now.getTime() - lastDay.getTime()) / (1000 * 60 * 60)
      : Infinity;

    let newStreak = rep.currentStreak ?? 0;
    if (hoursSinceLastContribution <= 48) {
      newStreak += 1;
    } else {
      newStreak = 1; // reset streak
    }

    await prisma.contributorReputation.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: { increment: newStreak > (rep.currentStreak ?? 0) ? 0 : 0 }, // handled below
      },
    });

    // Award streak bonus points
    await this.addPoints({ userId, points: POINT_EVENTS.streak_day, reason: `Day ${newStreak} streak` });

    // Check streak badges
    if (newStreak >= 30) await this.grantBadge(userId, "streak_30");
    else if (newStreak >= 7) await this.grantBadge(userId, "streak_7");
  }

  /**
   * Check all badge criteria and grant any newly-earned badges.
   */
  static async checkAndAwardBadges(userId: string) {
    const rep = await prisma.contributorReputation.findUnique({
      where: { userId },
      select: {
        trustScore: true,
        acceptedCount: true,
        rejectedCount: true,
        verificationBadges: true,
        currentStreak: true,
      },
    });
    if (!rep) return;

    const existingBadges = new Set(rep.verificationBadges ?? []);
    const newBadges: BadgeSlug[] = [];

    // First contribution
    if (!existingBadges.has("first_contribution") && rep.acceptedCount >= 1) {
      newBadges.push("first_contribution");
    }

    // Trusted contributor
    if (!existingBadges.has("trusted_contributor") && rep.acceptedCount >= 5 && (rep.trustScore ?? 0) >= 0.7) {
      newBadges.push("trusted_contributor");
    }

    // Intel expert
    if (!existingBadges.has("intel_expert") && rep.acceptedCount >= 20) {
      newBadges.push("intel_expert");
    }

    // Salary sharer
    const salaryCount = await prisma.interviewContribution.count({
      where: { userId, type: "salary", status: "approved" },
    });
    if (!existingBadges.has("salary_sharer") && salaryCount >= 3) {
      newBadges.push("salary_sharer");
    }

    // Experience reporter
    const expCount = await prisma.interviewContribution.count({
      where: { userId, type: "experience", status: "approved" },
    });
    if (!existingBadges.has("experience_reporter") && expCount >= 3) {
      newBadges.push("experience_reporter");
    }

    // Recruiter tracker
    const recruiterCount = await prisma.interviewContribution.count({
      where: { userId, type: "recruiter_pattern", status: "approved" },
    });
    if (!existingBadges.has("recruiter_tracker") && recruiterCount >= 3) {
      newBadges.push("recruiter_tracker");
    }

    for (const badge of newBadges) {
      await this.grantBadge(userId, badge);
    }

    return newBadges;
  }

  /**
   * Grant a specific badge and award its bonus points.
   */
  static async grantBadge(userId: string, badge: BadgeSlug) {
    const rep = await prisma.contributorReputation.findUnique({
      where: { userId },
      select: { verificationBadges: true },
    });
    if (!rep) return;
    if ((rep.verificationBadges ?? []).includes(badge)) return; // already granted

    const criteria = BADGE_CRITERIA[badge];
    await prisma.contributorReputation.update({
      where: { userId },
      data: {
        verificationBadges: { push: badge },
        totalPoints: { increment: criteria.points },
      },
    });

    // Invalidate leaderboard cache
    const redis = getRedisClient();
    await redis?.del("leaderboard:top50").catch(() => undefined);
  }

  /**
   * Get the leaderboard (top 50 contributors by total points).
   * Cached for 10 minutes.
   */
  static async getLeaderboard(): Promise<Array<{
    userId: string;
    name: string | null;
    totalPoints: number;
    acceptedCount: number;
    badges: string[];
    rank: number;
  }>> {
    const redis = getRedisClient();
    const cacheKey = "leaderboard:top50";
    const cached = await redis?.get<Array<{ userId: string; name: string | null; totalPoints: number; acceptedCount: number; badges: string[]; rank: number }>>(cacheKey).catch(() => null);
    if (cached) return cached;

    const rows = await prisma.contributorReputation.findMany({
      orderBy: { totalPoints: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    });

    const leaderboard = rows.map((row, i) => ({
      userId: row.userId,
      name: row.user.name ?? "Anonymous",
      totalPoints: row.totalPoints ?? 0,
      acceptedCount: row.acceptedCount,
      badges: row.verificationBadges ?? [],
      rank: i + 1,
    }));

    await redis?.set(cacheKey, leaderboard, { ex: 600 }).catch(() => undefined);
    return leaderboard;
  }

  /**
   * Get a user's current gamification profile.
   */
  static async getUserProfile(userId: string) {
    const rep = await prisma.contributorReputation.findUnique({
      where: { userId },
    });
    if (!rep) return null;

    const earnedBadges = (rep.verificationBadges ?? []).map((slug) => ({
      slug,
      ...BADGE_CRITERIA[slug as BadgeSlug],
    }));

    const availableBadges = Object.entries(BADGE_CRITERIA)
      .filter(([slug]) => !(rep.verificationBadges ?? []).includes(slug))
      .map(([slug, data]) => ({ slug, ...data, locked: true }));

    return {
      totalPoints: rep.totalPoints ?? 0,
      trustScore: rep.trustScore,
      acceptedCount: rep.acceptedCount,
      rejectedCount: rep.rejectedCount,
      currentStreak: rep.currentStreak ?? 0,
      longestStreak: rep.longestStreak ?? 0,
      earnedBadges,
      availableBadges,
    };
  }

  private static async addPoints(event: PointEvent) {
    await prisma.contributorReputation.upsert({
      where: { userId: event.userId },
      create: {
        userId: event.userId,
        totalPoints: Math.max(0, event.points),
        trustScore: 0.4,
        acceptedCount: 0,
        rejectedCount: 0,
      },
      update: {
        totalPoints: { increment: event.points },
      },
    });
  }
}
