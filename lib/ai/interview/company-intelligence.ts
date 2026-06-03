import { z } from "zod";
import { structuredJSON } from "@/lib/ai/structured";

// Zod schemas for structured AI outputs
export const CompanyIntelligenceSchema = z.object({
  difficultyScore: z.number().min(1).max(10),
  hiringStrictness: z.number().min(1).max(10),
  systemDesignDepth: z.number().min(1).max(10),
  behavioralWeight: z.number().min(1).max(10),
  communicationWeight: z.number().min(1).max(10),
  rounds: z.array(z.object({
    roundNumber: z.number(),
    name: z.string(),
    type: z.string(),
    duration: z.string(),
    focus: z.string(),
    expectedSignals: z.array(z.string()),
  })),
  evaluationStyle: z.string(),
  technicalFocus: z.array(z.string()),
  behavioralFocus: z.array(z.string()),
  commonHiringPatterns: z.array(z.string()),
  roleExpectations: z.string(),
  engineeringCulture: z.string(),
  expectedSenioritySignals: z.array(z.string()),
  compensationIntelligence: z.object({
    baseRange: z.string(),
    bonusStructure: z.string(),
    equityRange: z.string(),
    negotiability: z.string(),
  }),
});

export type CompanyIntelligence = z.infer<typeof CompanyIntelligenceSchema>;

const SYSTEM_PROMPT = `You are a world-class hiring intelligence researcher and tech recruiter in India.
Your task is to generate extremely accurate, realistic, and detailed Company Interview Intelligence for the given company and role.
Never use generic advice. Reflect actual India-market hiring trends, compensation levels, and structural rounds (e.g. Razorpay's Machine Coding round or Google's L4 Googliness round).
Ensure all scores are on a 1-10 scale.`;

export class CompanyIntelligenceEngine {
  static async generate(companyName: string, roleTitle: string, experienceLevel: string): Promise<CompanyIntelligence> {
    const userPrompt = `
Company Name: ${companyName}
Role Title: ${roleTitle}
Experience Level: ${experienceLevel}

Generate a comprehensive Interview Intelligence Map.
Include details on specific rounds, strictness, expectations, engineering culture, seniority signals, and localized compensation intelligence in INR.

Return ONLY a valid JSON matching this exact structure:
{
  "difficultyScore": number (1-10),
  "hiringStrictness": number (1-10),
  "systemDesignDepth": number (1-10),
  "behavioralWeight": number (1-10),
  "communicationWeight": number (1-10),
  "rounds": [
    {
      "roundNumber": number,
      "name": "string (e.g. Machine Coding)",
      "type": "string (e.g. machine_coding)",
      "duration": "string (e.g. 90 minutes)",
      "focus": "string detailing what this round is about",
      "expectedSignals": ["array", "of", "signals"]
    }
  ],
  "evaluationStyle": "string",
  "technicalFocus": ["array", "of", "technologies/algorithms/topics"],
  "behavioralFocus": ["array", "of", "behaviors/values"],
  "commonHiringPatterns": ["array", "of", "patterns"],
  "roleExpectations": "string",
  "engineeringCulture": "string",
  "expectedSenioritySignals": ["array", "of", "seniority signals"],
  "compensationIntelligence": {
    "baseRange": "string range in INR Lakhs per annum (e.g. 35 - 48 LPA)",
    "bonusStructure": "string",
    "equityRange": "string",
    "negotiability": "string"
  }
}`;

    const fallback: CompanyIntelligence = {
      difficultyScore: 7.5,
      hiringStrictness: 7.5,
      systemDesignDepth: 7.0,
      behavioralWeight: 6.5,
      communicationWeight: 7.5,
      rounds: [
        {
          roundNumber: 1,
          name: "Technical Screen",
          type: "technical",
          duration: "60 minutes",
          focus: "Core CS fundamentals and basic coding.",
          expectedSignals: ["Problem solving", "Code cleanliness"],
        },
        {
          roundNumber: 2,
          name: "System Design",
          type: "system_design",
          duration: "60 minutes",
          focus: "Architecture, trade-offs, and scalability.",
          expectedSignals: ["Trade-off thinking", "Scale limits"],
        },
      ],
      evaluationStyle: "Pragmatic, functional code with good communication.",
      technicalFocus: ["Data structures", "System architecture", "Databases"],
      behavioralFocus: ["Ownership", "Bias for action"],
      commonHiringPatterns: ["Expects running code", "Deep dive on transactional semantics"],
      roleExpectations: "Capable of owning a full feature end-to-end with high quality.",
      engineeringCulture: "Fast paced, collaborative, customer-centric.",
      expectedSenioritySignals: ["Handling ambiguity", "System trade-off awareness"],
      compensationIntelligence: {
        baseRange: "25 - 40 LPA",
        bonusStructure: "10-15% performance bonus",
        equityRange: "15-25 Lakhs ESOPs over 4 years",
        negotiability: "Highly negotiable with competing offers",
      },
    };

    return structuredJSON({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      schema: CompanyIntelligenceSchema,
      fallback,
    });
  }
}
