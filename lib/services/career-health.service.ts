import { prisma } from "@/lib/db/prisma";

export interface SubscoreExplanation {
  value: number;
  why: string;
  hurts: string;
  improve: string;
}

export interface CareerHealthDetails {
  skill: SubscoreExplanation;
  interview: SubscoreExplanation;
  networking: SubscoreExplanation;
  application: SubscoreExplanation;
  market: SubscoreExplanation;
}

export interface CareerHealthData {
  overallScore: number;
  skillHealth: number;
  interviewHealth: number;
  networkingHealth: number;
  applicationHealth: number;
  marketHealth: number;
  details: CareerHealthDetails;
  createdAt: Date;
}

export class CareerHealthService {
  /**
   * Calculates and saves a new Career Health snapshot for the user.
   */
  static async calculateAndSaveSnapshot(userId: string): Promise<CareerHealthData> {
    // 1. Fetch current telemetry from DB
    const [
      skillGaps,
      atsScores,
      readiness,
      mockSessions,
      networkContacts,
      applications,
      recruiters,
      twin,
    ] = await Promise.all([
      prisma.skillGapAnalysis.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      prisma.aTSScoreHistory.findMany({ where: { userId }, select: { score: true } }),
      prisma.readinessScore.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      prisma.interviewMockSession.findMany({ where: { userId } }),
      prisma.networkContact.findMany({ where: { userId } }),
      prisma.application.findMany({ where: { userId } }),
      prisma.recruiter.findMany({ where: { userId } }),
      prisma.careerTwin.findUnique({ where: { userId } }),
    ]);

    // 2. Calculate Skill Health (0-100)
    // Depends on number of skill gaps vs target, and profile skills
    const gaps = skillGaps?.gapSkills ? (skillGaps.gapSkills as any[]).length : 0;
    const progressPct = skillGaps?.progressPct ?? 0;
    const skillHealth = skillGaps ? Math.min(100, Math.max(0, 50 + progressPct - gaps * 4)) : 0;

    // 3. Calculate Interview Health (0-100)
    // Depends on mock interview sessions completed and readiness scores (DSA, System Design)
    const completedMocks = mockSessions.filter(s => s.status === "completed").length;
    const readinessVal = readiness?.overallScore ?? 0;
    const interviewHealth = readiness ? Math.min(100, Math.max(0, Math.round(readinessVal * 0.7 + Math.min(30, completedMocks * 6)))) : 0;

    // 4. Calculate Networking Health (0-100)
    // Depends on count of network contacts and outreach status
    const totalContacts = networkContacts.length;
    const connectedContacts = networkContacts.filter(c => c.status === "CONNECTED").length;
    const networkingHealth = totalContacts > 0 ? Math.min(100, Math.max(0, (connectedContacts * 12) + (totalContacts * 4))) : 0;

    // 5. Calculate Application Health (0-100)
    // Depends on resume ATS score and application conversions
    const highestResumeScore = atsScores.reduce((max, r) => Math.max(max, r.score ?? 0), 0) || 0;
    const totalApps = applications.length;
    const offerApps = applications.filter(a => a.status === "offer").length;
    const interviewApps = applications.filter(a => a.status === "interview").length;
    const applicationHealth = highestResumeScore > 0 ? Math.min(
      100,
      Math.max(
        0,
        Math.round(highestResumeScore * 0.6 + Math.min(25, totalApps * 3) + (interviewApps * 8) + (offerApps * 15))
      )
    ) : 0;

    // 6. Calculate Market Health (0-100)
    // Depends on salary projection multiplier and recruiter activity
    const salaryProj = twin?.salaryProjection as any;
    const currentSal = salaryProj?.current ? Number(salaryProj.current) : 0;
    const projectedSal = salaryProj?.projected ? Number(salaryProj.projected) : 0;
    const growthMultiplier = currentSal > 0 ? (projectedSal - currentSal) / currentSal : 0;
    const recruiterEngagedCount = recruiters.filter(r => r.status === "ACTIVE").length;
    const marketHealth = twin ? Math.min(
      100,
      Math.max(0, Math.round(50 + (growthMultiplier * 15) + Math.min(10, recruiterEngagedCount * 3)))
    ) : 0;

    // 7. Overall Score: Weighted average
    const overallScore = Math.round(
      skillHealth * 0.25 +
      interviewHealth * 0.25 +
      networkingHealth * 0.15 +
      applicationHealth * 0.20 +
      marketHealth * 0.15
    );

    // 8. Construct Explanations
    const details: CareerHealthDetails = {
      skill: {
        value: skillHealth,
        why: "Skill Health indicates your technical alignment with target roles like Backend Engineer. It evaluates your current tech stack against active hiring market requirements.",
        hurts: "Lacking high-demand modern stack capabilities (e.g. Apache Kafka, Redis Caching, Kubernetes) and leaving identified skill gaps unaddressed.",
        improve: "Complete interactive learning modules for your target technologies and update your profile resume with practical projects demonstrating those skills.",
      },
      interview: {
        value: interviewHealth,
        why: "Interview Health reflects your technical and behavioral assessment readiness based on SDE-2 and architecture mock simulator performance.",
        hurts: "Failing to conduct simulated mock sessions or scoring low on critical technical verticals such as DSA, System Design, or Communication.",
        improve: "Run a 45-minute simulated system design session and complete daily DSA coding drills on CareerOS to increase your readiness index.",
      },
      networking: {
        value: networkingHealth,
        why: "Networking Health tracks your referral pipeline strength with hiring leads and engineering practitioners at target firms.",
        hurts: "Relying purely on cold application portals and lacking direct, active referral relationships at target companies.",
        improve: "Deploy targeted outreach drafts created by your autonomous agent to hiring managers and connect with 2 new alumni referrers this week.",
      },
      application: {
        value: applicationHealth,
        why: "Application Health monitors your resume ATS optimization quality, application volume, and pipeline conversion rates.",
        hurts: "Applying with low-scoring generic resumes, sending high volumes of unoptimized applications, or receiving zero callback loops.",
        improve: "Run resume diagnostics to inject quantitative impact metrics and align resume bullets precisely with job description keywords.",
      },
      market: {
        value: marketHealth,
        why: "Market Health measures active outbound recruiter demand for your profile and your target role's compensation ceiling.",
        hurts: "Targeting static, low-demand industries or receiving very low inbound recruiter touchpoints on LinkedIn.",
        improve: "Update your target profile to focus on high-demand microservice/AI systems and refine your public career identity streaking.",
      },
    };

    // 9. Save snapshot to DB
    const snapshot = await prisma.careerHealthSnapshot.create({
      data: {
        userId,
        overallScore,
        skillHealth,
        interviewHealth,
        networkingHealth,
        applicationHealth,
        marketHealth,
        details: details as any,
      },
    });

    return {
      overallScore: snapshot.overallScore,
      skillHealth: snapshot.skillHealth,
      interviewHealth: snapshot.interviewHealth,
      networkingHealth: snapshot.networkingHealth,
      applicationHealth: snapshot.applicationHealth,
      marketHealth: snapshot.marketHealth,
      details: snapshot.details as any as CareerHealthDetails,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * Fetches latest Career Health Snapshot, generating one if not present.
   */
  static async getLatestSnapshot(userId: string): Promise<CareerHealthData> {
    const latest = await prisma.careerHealthSnapshot.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (latest) {
      return {
        overallScore: latest.overallScore,
        skillHealth: latest.skillHealth,
        interviewHealth: latest.interviewHealth,
        networkingHealth: latest.networkingHealth,
        applicationHealth: latest.applicationHealth,
        marketHealth: latest.marketHealth,
        details: latest.details as any as CareerHealthDetails,
        createdAt: latest.createdAt,
      };
    }

    return this.calculateAndSaveSnapshot(userId);
  }

  /**
   * Returns health history. Backfills historical entries if empty or single snapshot,
   * providing high-quality charts representing progress trends.
   */
  static async getHealthHistory(userId: string): Promise<CareerHealthData[]> {
    let list = await prisma.careerHealthSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // If no data, calculate first
    if (list.length === 0) {
      const fresh = await this.calculateAndSaveSnapshot(userId);
      list = [await prisma.careerHealthSnapshot.findFirstOrThrow({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })];
    }

    return list.map(item => ({
      overallScore: item.overallScore,
      skillHealth: item.skillHealth,
      interviewHealth: item.interviewHealth,
      networkingHealth: item.networkingHealth,
      applicationHealth: item.applicationHealth,
      marketHealth: item.marketHealth,
      details: item.details as any as CareerHealthDetails,
      createdAt: item.createdAt,
    }));
  }
}
