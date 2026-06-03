import { z } from "zod";
import { structuredJSON } from "@/lib/ai/structured";

export const PreparationRoadmapSchema = z.object({
  sevenDays: z.array(z.string()),
  fourteenDays: z.array(z.string()),
  thirtyDays: z.array(z.string()),
});

export type PreparationRoadmap = z.infer<typeof PreparationRoadmapSchema>;

export class RoadmapEngine {
  static async generate(
    roleTitle: string,
    companyName: string | undefined,
    resumeText: string | undefined,
    jobDescription: string | undefined,
    pastMockScores: number[]
  ): Promise<PreparationRoadmap> {
    const systemPrompt = `You are a world-class engineering lead and preparation coach in India.
Your job is to generate a highly detailed 7, 14, and 30-day prep roadmap for a candidate targeted at a specific role/company.
Make the advice actionable, specific to Indian tech firms (like Swiggy, Razorpay, CRED), and tailored to the candidate's gaps.`;

    const userPrompt = `
Generate a structured 7-day, 14-day, and 30-day preparation plan.
Role: ${roleTitle}
Company: ${companyName || "N/A"}
Resume: ${resumeText || "N/A"}
Job Description: ${jobDescription || "N/A"}
Past Scores: ${pastMockScores.join(", ") || "None"}
`;

    const fallback: PreparationRoadmap = {
      sevenDays: [
        "Drill top 5 repeated company-specific design patterns: payment gateways, URL shortener.",
        "Write executable low-level designs for core entities using SOLID principles.",
      ],
      fourteenDays: [
        "Practice 10 LeetCode medium/hard problems on dynamic programming and graph traversals under a 20-minute timer.",
        "Perform 2 mock system design sessions focusing on capacity calculations.",
      ],
      thirtyDays: [
        "Refine 4 key behavioral STAR stories highlighting leadership, manager disagreement, and engineering excellence.",
        "Master general CS fundamentals (OS thread safety, ACID isolation levels).",
      ],
    };

    return structuredJSON({
      system: systemPrompt,
      user: userPrompt,
      schema: PreparationRoadmapSchema,
      fallback,
    });
  }
}
