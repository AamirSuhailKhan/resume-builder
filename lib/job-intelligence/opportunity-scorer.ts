import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

interface OpportunityScoreInput {
  jobId: string;
  companyName: string;
  role: string;
  userMatchScore: number;
}

export class OpportunityScorer {
  /**
   * Generates or retrieves the JobIntelligence for a given job opportunity.
   */
  static async computeOpportunityScore(input: OpportunityScoreInput) {
    try {
      // 1. Check if intelligence already exists
      const existing = await prisma.jobIntelligence.findUnique({
        where: { jobOpportunityId: input.jobId },
      });

      if (existing && Date.now() - existing.computedAt.getTime() < 1000 * 60 * 60 * 24) {
        return existing; // Return cached intelligence if < 24 hours old
      }

      // 2. Fetch company intelligence
      const companyInt = await prisma.companyIntelligence.findUnique({
        where: { companyName: input.companyName },
      });

      // 3. Compute baseline metrics
      const hiringVelocity = this.calculateHiringVelocity(companyInt?.hiringVelocity);
      const layoffRisk = this.calculateLayoffRisk(companyInt?.layoffRisk);
      const companyMomentum = companyInt?.healthScore ?? 50;
      
      const marketDemand = this.calculateMarketDemand(input.role);
      const competitionScore = Math.random() * 40 + 60; // Mock: Usually derived from ATS/market data
      
      const matchQuality = Math.min(100, Math.max(0, input.userMatchScore));
      
      // Calculate stability score
      const stabilityScore = 100 - layoffRisk + (companyMomentum * 0.5);

      const careerGrowth = 75 + (companyMomentum * 0.15) - (layoffRisk * 0.1);

      // 4. Calculate Final Opportunity Score (0-100)
      // Weights:
      // Match Quality: 30%
      // Market Demand: 15%
      // Growth: 20%
      // Stability: 15%
      // Hiring Velocity: 10%
      // Competition: -10% (lower competition = higher score)
      
      let rawScore = 
        (matchQuality * 0.30) +
        (marketDemand * 0.15) +
        (careerGrowth * 0.20) +
        (stabilityScore * 0.15) +
        (hiringVelocity * 0.10) +
        ((100 - competitionScore) * 0.10);

      const opportunityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      // 5. Mock Salary & Trends
      const salaryPrediction = {
        min: 100000 + Math.random() * 20000,
        max: 150000 + Math.random() * 30000,
        currency: "USD",
        confidence: 0.85
      };

      const skillDemandTrends = [
        { skill: "React", trend: "up" },
        { skill: "Node.js", trend: "stable" },
        { skill: "TypeScript", trend: "up" }
      ];

      // 6. Upsert to database
      const intelligence = await prisma.jobIntelligence.upsert({
        where: { jobOpportunityId: input.jobId },
        update: {
          opportunityScore,
          hiringVelocity,
          marketDemand,
          competitionScore,
          salaryPrediction,
          layoffRisk,
          careerGrowth,
          skillDemandTrends,
          companyMomentum,
          matchQuality,
          stabilityScore,
          computedAt: new Date()
        },
        create: {
          jobOpportunityId: input.jobId,
          opportunityScore,
          hiringVelocity,
          marketDemand,
          competitionScore,
          salaryPrediction,
          layoffRisk,
          careerGrowth,
          skillDemandTrends,
          companyMomentum,
          matchQuality,
          stabilityScore
        }
      });

      return intelligence;
    } catch (error) {
      logger.error({ error, jobId: input.jobId }, "Failed to compute opportunity score");
      throw error;
    }
  }

  private static calculateHiringVelocity(velocityStr?: string): number {
    switch (velocityStr?.toLowerCase()) {
      case "high": return 90;
      case "medium": return 60;
      case "low": return 30;
      case "frozen": return 0;
      default: return 50;
    }
  }

  private static calculateLayoffRisk(riskStr?: string): number {
    switch (riskStr?.toLowerCase()) {
      case "high": return 80;
      case "medium": return 50;
      case "low": return 20;
      case "none": return 5;
      default: return 40;
    }
  }

  private static calculateMarketDemand(role: string): number {
    // In production, this would query the MarketAnalyzer or JobAggregator for role frequency
    const roleLower = role.toLowerCase();
    if (roleLower.includes("engineer") || roleLower.includes("developer")) return 85;
    if (roleLower.includes("data") || roleLower.includes("ai")) return 95;
    if (roleLower.includes("product") || roleLower.includes("manager")) return 75;
    return 60;
  }
}
