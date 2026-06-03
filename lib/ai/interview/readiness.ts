import { z } from "zod";
import { structuredJSON } from "@/lib/ai/structured";

export const ReadinessRoadmapSchema = z.object({
  overallReadinessScore: z.number().min(0).max(100),
  competencyScores: z.object({
    dsa: z.number().min(0).max(100),
    systemDesign: z.number().min(0).max(100),
    behavioral: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    domainKnowledge: z.number().min(0).max(100),
  }),
  companyFitIndex: z.number().min(0).max(100),
  keyGaps: z.array(z.object({
    area: z.string(),
    gapDescription: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  })),
  roadmap: z.object({
    sevenDays: z.array(z.string()),
    fourteenDays: z.array(z.string()),
    thirtyDays: z.array(z.string()),
  }),
  impactTips: z.array(z.string()),
  recruiterNotesHint: z.string(),
});

export type ReadinessRoadmap = z.infer<typeof ReadinessRoadmapSchema>;

const SYSTEM_PROMPT = `You are a world-class hiring architect and prep planner in India.
Your job is to analyze a candidate's profile (resume, experience), the target role & company requirements, and their mock interview performance to calculate an extremely detailed Readiness Profile and a highly personalized preparation roadmap (7, 14, and 30-day plan).
Be hyper-specific. Avoid generic advice (like "practice coding"). Recommend specific topics (e.g. "Drill graph traversals, bipartite matching, or segment trees").
Ensure all plans correspond closely to the target company's hiring trends (e.g. if the company is Swiggy, emphasize machine coding and geo-spatial system design; if it is Razorpay, emphasize concurrent API designs and transaction ledgers).`;

export class ReadinessEngine {
  static async calculate(
    roleTitle: string,
    companyName: string | undefined,
    resumeText: string | undefined,
    jobDescription: string | undefined,
    pastMockScores: number[]
  ): Promise<ReadinessRoadmap> {
    const userPrompt = `
Role: ${roleTitle}
${companyName ? `Target Company: ${companyName}` : ""}
${resumeText ? `Candidate Resume Context:\n${resumeText}\n` : ""}
${jobDescription ? `Job Description Context:\n${jobDescription}\n` : ""}
Past Mock Interview Scores: ${pastMockScores.join(", ") || "None recorded yet"}

Calculate a comprehensive Hiring Readiness Score and generate a structured 7/14/30 day preparation roadmap.
Detail the key competency gaps (DSA, System Design, Behavioral, Communication, Domain Knowledge), company fit index, key high priority areas, and high impact prep tips.

Return ONLY a valid JSON matching this exact structure:
{
  "overallReadinessScore": number (0-100),
  "competencyScores": {
    "dsa": number,
    "systemDesign": number,
    "behavioral": number,
    "communication": number,
    "domainKnowledge": number
  },
  "companyFitIndex": number,
  "keyGaps": [
    { "area": "string", "gapDescription": "string", "priority": "high | medium | low" }
  ],
  "roadmap": {
    "sevenDays": ["action item 1", "action item 2"],
    "fourteenDays": ["action item 1", "action item 2"],
    "thirtyDays": ["action item 1", "action item 2"]
  },
  "impactTips": ["tip 1", "tip 2"],
  "recruiterNotesHint": "A short summary of what the recruiters at this company are looking for."
}`;

    const fallback: ReadinessRoadmap = {
      overallReadinessScore: 68,
      competencyScores: {
        dsa: 72,
        systemDesign: 60,
        behavioral: 75,
        communication: 78,
        domainKnowledge: 65,
      },
      companyFitIndex: 70,
      keyGaps: [
        { area: "System Design", gapDescription: "Lacks deep trade-off thinking on relational vs non-relational database consistency models.", priority: "high" },
        { area: "Data Structures", gapDescription: "Struggles to complete DP or hard graph problems within the 20-minute threshold.", priority: "medium" },
      ],
      roadmap: {
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
      },
      impactTips: [
        "Focus on system design clarify questions - always define numbers (QPS, storage scale) first.",
        "Practice machine coding: compile and test modular code within 90 minutes.",
      ],
      recruiterNotesHint: "Recruiters look for high ownership and bias for action. Clean, modular code is favored over complex but incomplete designs.",
    };

    return structuredJSON({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      schema: ReadinessRoadmapSchema,
      fallback,
    });
  }
}
