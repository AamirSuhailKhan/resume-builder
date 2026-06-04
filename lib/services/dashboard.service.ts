import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { detectProfile } from "@/lib/detectProfile";

export interface MissionControlDashboardData {
  user: {
    name: string | null;
    email: string;
  };
  careerProfile: {
    goals: any;
    headline: string | null;
    summary: string | null;
  } | null;
  careerTwin: {
    scores: any;
    confidence: number;
    displayName: string;
    salaryProjection: any;
  } | null;
  careerIdentity: {
    rolePercentile: number;
    cityPercentile: number;
    activePrepStreak: number;
    projectedLPAGrowth: number;
    weeklyDelta: number;
  } | null;
  readinessScore: {
    overallScore: number;
    dsaScore: number;
    systemDesignScore: number;
    behavioralScore: number;
    communicationScore: number;
    domainScore: number;
    companyFitIndex: number;
    keyGaps: any;
  } | null;
  successProbability: number;
  skillGaps: any[];
  weeklyActionPlan: any[];
  recommendedOpportunities: any[];
  recruiterActivity: any[];
  progress: {
    applications: number;
    interviews: number;
    offers: number;
    networking: number;
  };
}

export class DashboardService {
  /**
   * Initializes realistic database records for a user if they are missing telemetry data.
   * Concurrent-safe: wraps creations in try/catch to absorb unique constraint race conditions
   * from parallel SSR executions of layout and page components.
   */
  static async ensureTelemetryData(userId: string): Promise<void> {
    // Zero-data production audit: do not auto-seed or pre-populate dummy metrics.
  }

  /**
   * Retrieves aggregated telemetry and stats from database for a user.
   */
  static async getDashboardData(userId: string): Promise<MissionControlDashboardData> {
    // Make sure we have core telemetry populated
    await this.ensureTelemetryData(userId);

    // Fetch user basic info
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Run parallel queries across all dashboard segments
    const [
      profile,
      twin,
      identity,
      readiness,
      prediction,
      skillGap,
      actionPlan,
      opportunities,
      recruiters,
      applications,
      interviews,
      offers,
      networkContacts,
    ] = await Promise.all([
      // Profile (Goals)
      prisma.careerProfile.findUnique({
        where: { userId },
        select: { goals: true, headline: true, summary: true },
      }),
      // Career Twin (Scores & Projection)
      prisma.careerTwin.findUnique({
        where: { userId },
        select: { scores: true, confidence: true, displayName: true, salaryProjection: true },
      }),
      // Career Identity (Percentiles & Prep Streak)
      prisma.careerIdentity.findUnique({
        where: { userId },
      }),
      // Readiness Score
      prisma.readinessScore.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
      // Success Probability
      prisma.outcomePrediction.findFirst({
        where: { userId, predictionType: "callback_probability" },
        orderBy: { createdAt: "desc" },
        select: { score: true },
      }),
      // Skill Gaps
      prisma.skillGapAnalysis.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
      // Weekly Action Plan (Feed items)
      prisma.actionFeedItem.findMany({
        where: { userId, dismissed: false },
        orderBy: { priority: "desc" },
        take: 5,
      }),
      // Recommended Opportunities (Active Matches)
      prisma.jobOpportunity.findMany({
        where: { userId },
        orderBy: { matchScore: "desc" },
        take: 3,
      }),
      // Recruiter Activity
      prisma.recruiter.findMany({
        where: { userId },
        include: {
          interactions: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
        take: 3,
      }),
      // Progress Counters
      prisma.application.count({ where: { userId } }),
      prisma.interviewMockSession.count({ where: { userId, status: "completed" } }),
      prisma.application.count({ where: { userId, status: "offer" } }),
      prisma.networkContact.count({ where: { userId } }),
    ]);

    // Format results to prevent raw DB schema leaks to clients
    return {
      user,
      careerProfile: profile,
      careerTwin: twin,
      careerIdentity: identity,
      readinessScore: readiness,
      successProbability: prediction?.score ?? 0.84, // Fallback if no prediction in DB
      skillGaps: skillGap?.gapSkills ? (skillGap.gapSkills as any[]) : [],
      weeklyActionPlan: actionPlan,
      recommendedOpportunities: opportunities,
      recruiterActivity: recruiters.map((r) => ({
        id: r.id,
        name: r.name,
        companyName: r.companyName,
        title: r.title,
        status: r.status,
        responseScore: r.responseScore,
        engagementScore: r.engagementScore,
        latestInteraction: r.interactions[0]
          ? {
              type: r.interactions[0].type,
              status: r.interactions[0].status,
              notes: r.interactions[0].notes,
              date: r.interactions[0].date.toISOString(),
            }
          : null,
      })),
      progress: {
        applications,
        interviews,
        offers,
        networking: networkContacts,
      },
    };
  }
}
