import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface ScenarioForecast {
  salary6Months: number; // in LPA
  salary12Months: number; // in LPA
  interviewSuccessProb: number; // 0-100%
  offerProb: number; // 0-100%
  goalCompletionProb: number; // 0-100%
  assumptions: string[];
  levers: string[];
}

export interface CareerForecastData {
  currentSalary: number; // in LPA
  currency: string;
  unit: string;
  readinessScore: number;
  currentPath: ScenarioForecast;
  aggressivePath: ScenarioForecast;
  optimizedPath: ScenarioForecast;
  createdAt: Date;
}

export class CareerForecastingService {
  /**
   * Helper to parse salary projections into LPA
   */
  private static parseSalaryToLpa(value: any): number {
    if (!value) return 18; // default 18 LPA
    
    // If it's a large number like 1800000, convert to 18 LPA
    if (typeof value === "number") {
      if (value > 100000) {
        return Math.round(value / 100000);
      }
      return value;
    }
    
    if (typeof value === "string") {
      const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed)) {
        if (parsed > 100000) {
          return Math.round(parsed / 100000);
        }
        return parsed;
      }
    }
    
    return 18;
  }

  /**
   * Generates or fetches the career forecasts for a user.
   */
  static async getForecasts(userId: string): Promise<CareerForecastData> {
    // 1. Load telemetry data from database
    const [profile, twin, applications, readiness, resume] = await Promise.all([
      prisma.careerProfile.findUnique({
        where: { userId },
        select: { goals: true, headline: true },
      }),
      prisma.careerTwin.findUnique({
        where: { userId },
        select: { id: true, salaryProjection: true, scores: true },
      }),
      prisma.application.findMany({
        where: { userId },
        select: { status: true },
      }),
      prisma.readinessScore.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { overallScore: true },
      }),
      prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { data: true },
      })
    ]);

    // 2. Determine baseline current salary
    let currentSalary = 18; // Default 18 LPA (approx 1.8M INR)
    let currency = "INR";
    let unit = "LPA";

    if (twin?.salaryProjection) {
      const proj = twin.salaryProjection as any;
      if (proj.current) {
        currentSalary = this.parseSalaryToLpa(proj.current);
      } else if (proj.currentMarket?.p50) {
        currentSalary = this.parseSalaryToLpa(proj.currentMarket.p50);
      }
      if (proj.currency) currency = proj.currency;
      if (proj.unit) unit = proj.unit;
    } else if (profile?.goals) {
      const goals = profile.goals as any;
      if (goals.targetSalary) {
        // Assume current is ~60% of target salary if not specified, capped at reasonable starting point
        const target = this.parseSalaryToLpa(goals.targetSalary);
        currentSalary = Math.max(10, Math.round(target * 0.65));
      }
    }

    // 3. Compute base conversion metrics from real data
    const totalApps = applications.length;
    const totalInterviews = applications.filter(a => a.status === "interview").length;
    const totalOffers = applications.filter(a => a.status === "offer").length;
    
    const interviewRate = totalApps > 0 ? (totalInterviews / totalApps) : 0.08;
    const offerRate = totalInterviews > 0 ? (totalOffers / totalInterviews) : 0.25;
    const readinessScore = readiness?.overallScore ?? 70;

    // 4. Calculate predictions per path scenario
    
    // SCENARIO 1: CURRENT PATH
    // Assumptions: Baseline applications, no major resume/skill upgrades, average conversion.
    const currentPath: ScenarioForecast = {
      salary6Months: Math.round(currentSalary * 1.05), // 5% cost-of-living/modest adjustment
      salary12Months: Math.round(currentSalary * 1.12), // 12% standard promotion/annual hike
      interviewSuccessProb: Math.round(Math.min(95, Math.max(20, readinessScore * 0.7))), // conversion rate linked to readiness
      offerProb: Math.round(Math.min(95, Math.max(10, offerRate * 100))),
      goalCompletionProb: Math.round(Math.min(95, Math.max(15, (interviewRate * 0.4 + offerRate * 0.6) * 100))),
      assumptions: [
        "Maintain current application frequency of ~8-10 applications/month",
        "Rely on existing resume configuration and ATS keyword alignment",
        "Continue utilizing cold-outbox outreach channels without referrers"
      ],
      levers: [
        "Increase weekly application volume slightly (+15%)",
        "Engage with existing network contacts for inbound alerts",
        "Complete outstanding mock interview modules to boost conversion"
      ]
    };

    // SCENARIO 2: AGGRESSIVE PATH
    // Assumptions: High volume of applications, aiming for top-bracket offers, higher risk.
    const aggressivePath: ScenarioForecast = {
      salary6Months: Math.round(currentSalary * 1.22), // 22% bump by hitting high-paying roles
      salary12Months: Math.round(currentSalary * 1.45), // 45% bump by compounding offers
      // Interview conversion is slightly lower in aggressive path because they target stretch roles
      interviewSuccessProb: Math.round(Math.min(95, Math.max(30, readinessScore * 0.6))), 
      offerProb: Math.round(Math.min(95, Math.max(25, (offerRate * 0.8 + 0.15) * 100))), // volume offsets slightly lower rate
      goalCompletionProb: Math.round(Math.min(95, Math.max(40, (interviewRate * 0.5 + 0.2) * 100))),
      assumptions: [
        "Deploy aggressive outreach strategy targeting >35 applications/month",
        "Target next-level roles (e.g. principal or architect tracks)",
        "Optimize profile strictly for salary upside and compensation leverage"
      ],
      levers: [
        "Schedule back-to-back mock system design drills weekly",
        "De-risk burnout by implementing mandatory 48-hour pause windows",
        "Maintain clean logs of active recruiter pipelines to prevent ghosting"
      ]
    };

    // SCENARIO 3: OPTIMIZED PATH
    // Assumptions: High-fit matching, full ATS resume optimization, skill gap closure, warm referrals.
    const optimizedPath: ScenarioForecast = {
      salary6Months: Math.round(currentSalary * 1.28), // 28% increase via high-leverage referral matching
      salary12Months: Math.round(currentSalary * 1.60), // 60% increase via competing offers & skill validation
      interviewSuccessProb: Math.round(Math.min(98, Math.max(50, readinessScore * 0.85 + 15))), // high tailoring raises conversion
      offerProb: Math.round(Math.min(98, Math.max(40, (offerRate * 1.2 + 0.2) * 100))), // warm paths and prep dramatically raise odds
      goalCompletionProb: Math.round(Math.min(98, Math.max(55, 92))), // target goals are highly likely to be met
      assumptions: [
        "Optimize all applications via precise ATS keyword matching (score > 85)",
        "Rely strictly on referral routes and warm recruiter intro connections",
        "Close top 2 critical skill gaps identified in your Career Graph"
      ],
      levers: [
        "Submit 3 customized applications via internal referrals weekly",
        "Synthesize project artifacts demonstrating target skills (e.g., Redis caching)",
        "Run target salary evaluations using CTC Decoder before scheduling final rounds"
      ]
    };

    // 5. Store this forecast comparison as a CareerSimulation record for persistence and transparency
    if (twin?.id) {
      try {
        await prisma.careerSimulation.create({
          data: {
            twinId: twin.id,
            userId,
            question: "Career Forecasting Engine: Scenario Comparison",
            scenario: {
              currentSalary,
              currency,
              unit,
            } as unknown as Prisma.InputJsonValue,
            baseline: {
              totalApplications: totalApps,
              interviewRate,
              offerRate,
              readinessScore,
            } as unknown as Prisma.InputJsonValue,
            projection: {
              currentPath,
              aggressivePath,
              optimizedPath,
            } as unknown as Prisma.InputJsonValue,
            confidenceIntervals: {
              currentRange: [currentPath.salary6Months, currentPath.salary12Months],
              aggressiveRange: [aggressivePath.salary6Months, aggressivePath.salary12Months],
              optimizedRange: [optimizedPath.salary6Months, optimizedPath.salary12Months],
            } as unknown as Prisma.InputJsonValue,
            uncertainty: [
              "Hiring pace fluctuates with quarterly budget shifts",
              "Referral response rate is highly dependent on relationship strength",
              "Actual offer compensation may require active counter-offer leverage"
            ] as unknown as Prisma.InputJsonValue,
            recommendation: "Deploy the Optimized Path immediately: close your top 2 skill gaps, ensure all resume ATS scores are >85, and route at least 50% of applications through warm referrals to achieve 1.6x salary growth within 12 months.",
            confidence: 0.82
          }
        });
      } catch (e) {
        console.error("Failed to save forecast simulation record:", e);
      }
    }

    return {
      currentSalary,
      currency,
      unit,
      readinessScore,
      currentPath,
      aggressivePath,
      optimizedPath,
      createdAt: new Date(),
    };
  }
}
