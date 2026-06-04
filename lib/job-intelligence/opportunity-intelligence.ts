import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { geminiJSON } from "@/lib/ai/core";
import { z } from "zod";

const OpportunityIntelligenceSchema = z.object({
  opportunityScore: z.number().min(0).max(100),
  skillMatch: z.number().min(0).max(100),
  salaryGrowth: z.number().min(0).max(100),
  competition: z.number().min(0).max(100),
  careerGrowth: z.number().min(0).max(100),
  hiringDemand: z.number().min(0).max(100),
  marketTrends: z.number().min(0).max(100),
  interviewProbability: z.number().min(0).max(100),
  whyMatters: z.string(),
  salaryGrowthExplanation: z.string(),
  requiredSkills: z.array(z.string()),
  successProbability: z.number().min(0).max(100),
  predictedSalaryMin: z.number(),
  predictedSalaryMax: z.number(),
  predictedSalaryCurrency: z.string().default("INR"),
  layoffRisk: z.number().min(0).max(100),
  companyMomentum: z.number().min(0).max(100),
  stabilityScore: z.number().min(0).max(100),
});

export type OpportunityIntelligence = z.infer<typeof OpportunityIntelligenceSchema>;

export class OpportunityIntelligenceService {
  static async computeOpportunityIntelligence(jobOpportunityId: string, userId: string): Promise<OpportunityIntelligence> {
    try {
      // 1. Fetch Job
      const job = await prisma.jobOpportunity.findUnique({
        where: { id: jobOpportunityId },
      });
      if (!job) {
        throw new Error(`Job Opportunity ${jobOpportunityId} not found`);
      }

      // 2. Fetch User & Resume
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeResumeId: true },
      });

      let resumeData: any = null;
      if (user?.activeResumeId) {
        const resume = await prisma.resume.findUnique({
          where: { id: user.activeResumeId },
        });
        resumeData = resume?.data;
      } else {
        const latestResume = await prisma.resume.findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        resumeData = latestResume?.data;
      }

      // 3. Fetch Career Profile (for 5-year goal & target salary)
      const careerProfile = await prisma.careerProfile.findUnique({
        where: { userId },
      });

      // 4. Format Prompt Context
      const goalsText = careerProfile?.goals
        ? typeof careerProfile.goals === "string"
          ? careerProfile.goals
          : JSON.stringify(careerProfile.goals)
        : "Not specified";

      const resumeText = resumeData
        ? typeof resumeData === "string"
          ? resumeData
          : JSON.stringify({
              skills: resumeData.skills,
              summary: resumeData.personal?.summary,
              experience: resumeData.work?.map((w: any) => ({
                role: w.position,
                company: w.company,
                summary: w.summary,
              })),
            })
        : "No resume profile available.";

      const targetSalaryText = careerProfile?.salaryExpectation
        ? JSON.stringify(careerProfile.salaryExpectation)
        : "Not specified";

      const systemPrompt = `You are a staff career intelligence analyst. Your task is to perform an deep-level Opportunity Analysis of a job opening against a user's professional profile.
Analyze the opportunity based on:
1. Skill Match: How well user's current skills align with the required skills.
2. Salary Growth: Growth potential compared to target salary and standard industry bumps.
3. Competition: Relative difficulty of getting this role based on standard candidate supply.
4. Career Growth: Alignment with user's 5-year goal (${goalsText}).
5. Hiring Demand: Current hiring urgency, velocity, and market need.
6. Market Trends: Future relevance of the job domain and key skills.
7. Interview Probability: Chances of scoring an interview based on profile fit.

Return a JSON object conforming exactly to the following schema:
{
  "opportunityScore": number (0-100),
  "skillMatch": number (0-100),
  "salaryGrowth": number (0-100),
  "competition": number (0-100),
  "careerGrowth": number (0-100),
  "hiringDemand": number (0-100),
  "marketTrends": number (0-100),
  "interviewProbability": number (0-100),
  "whyMatters": "Clear explanation of why this opportunity matters for the user",
  "salaryGrowthExplanation": "Explicit prediction details on expected salary growth & market comparison",
  "requiredSkills": ["list", "of", "required", "skills"],
  "successProbability": number (0-100),
  "predictedSalaryMin": number,
  "predictedSalaryMax": number,
  "predictedSalaryCurrency": "INR" or "USD",
  "layoffRisk": number (0-100),
  "companyMomentum": number (0-100),
  "stabilityScore": number (0-100)
}
Be precise. Calculate real scores. Do not return mock or placeholder values.`;

      const userPrompt = `USER PROFILE:
- Resume Summary & Skills: ${resumeText}
- 5-Year Career Goal: ${goalsText}
- Target Salary: ${targetSalaryText}

JOB OPPORTUNITY:
- Role: ${job.role}
- Company: ${job.company}
- Location: ${job.location ?? "Remote / Unknown"}
- Salary Range: ${job.salaryRange ?? "Not listed"}
- Description: ${job.description}`;

      const fallback: OpportunityIntelligence = {
        opportunityScore: 70,
        skillMatch: 70,
        salaryGrowth: 60,
        competition: 50,
        careerGrowth: 75,
        hiringDemand: 65,
        marketTrends: 70,
        interviewProbability: 60,
        whyMatters: "Good baseline match for your skills and career trajectory.",
        salaryGrowthExplanation: "Standard market rate bump anticipated.",
        requiredSkills: ["React", "TypeScript", "Node.js"],
        successProbability: 60,
        predictedSalaryMin: 1200000,
        predictedSalaryMax: 1800000,
        predictedSalaryCurrency: "INR",
        layoffRisk: 20,
        companyMomentum: 70,
        stabilityScore: 80,
      };

      const result = await geminiJSON<OpportunityIntelligence>({
        system: systemPrompt,
        user: userPrompt,
        fallback,
        schema: OpportunityIntelligenceSchema,
        temperature: 0.2,
      });

      // 5. Upsert to DB
      await prisma.jobIntelligence.upsert({
        where: { jobOpportunityId },
        update: {
          opportunityScore: result.opportunityScore,
          hiringVelocity: result.hiringDemand,
          marketDemand: result.marketTrends,
          competitionScore: result.competition,
          salaryPrediction: {
            min: result.predictedSalaryMin,
            max: result.predictedSalaryMax,
            currency: result.predictedSalaryCurrency,
            explanation: result.salaryGrowthExplanation,
          },
          layoffRisk: result.layoffRisk,
          careerGrowth: result.careerGrowth,
          companyMomentum: result.companyMomentum,
          matchQuality: result.skillMatch,
          stabilityScore: result.stabilityScore,
          whyMatters: result.whyMatters,
          interviewProbability: result.interviewProbability,
          successProbability: result.successProbability,
          requiredSkills: result.requiredSkills,
          salaryGrowth: result.salaryGrowth,
          computedAt: new Date(),
        },
        create: {
          jobOpportunityId,
          opportunityScore: result.opportunityScore,
          hiringVelocity: result.hiringDemand,
          marketDemand: result.marketTrends,
          competitionScore: result.competition,
          salaryPrediction: {
            min: result.predictedSalaryMin,
            max: result.predictedSalaryMax,
            currency: result.predictedSalaryCurrency,
            explanation: result.salaryGrowthExplanation,
          },
          layoffRisk: result.layoffRisk,
          careerGrowth: result.careerGrowth,
          companyMomentum: result.companyMomentum,
          matchQuality: result.skillMatch,
          stabilityScore: result.stabilityScore,
          whyMatters: result.whyMatters,
          interviewProbability: result.interviewProbability,
          successProbability: result.successProbability,
          requiredSkills: result.requiredSkills,
          salaryGrowth: result.salaryGrowth,
        },
      });

      return result;
    } catch (error) {
      logger.error({ error, jobOpportunityId }, "Failed to compute opportunity intelligence");
      throw error;
    }
  }

  static async getRankedOpportunities(userId: string) {
    const opportunities = await prisma.jobOpportunity.findMany({
      where: { userId },
      include: {
        intelligence: true,
      },
    });

    // Automatically trigger analysis for opportunities that don't have fresh intelligence
    const analyzedOpportunities = await Promise.all(
      opportunities.map(async (opp) => {
        let intel = opp.intelligence;
        if (!intel || Date.now() - intel.computedAt.getTime() > 1000 * 60 * 60 * 24 * 7) {
          try {
            const freshIntel = await this.computeOpportunityIntelligence(opp.id, userId);
            // Fetch updated model
            const updatedIntel = await prisma.jobIntelligence.findUnique({
              where: { jobOpportunityId: opp.id },
            });
            intel = updatedIntel;
          } catch (e) {
            logger.warn({ oppId: opp.id, error: e }, "Lazy intelligence generation failed during ranking");
          }
        }

        const mappedIntel = intel ? {
          ...intel,
          salaryGrowthExplanation: (intel.salaryPrediction as any)?.explanation || ""
        } : null;

        return {
          ...opp,
          intelligence: mappedIntel,
        };
      })
    );

    // Sort by opportunityScore descending, handling null intelligence
    return analyzedOpportunities.sort((a, b) => {
      const scoreA = a.intelligence?.opportunityScore ?? 0;
      const scoreB = b.intelligence?.opportunityScore ?? 0;
      return scoreB - scoreA;
    });
  }
}
