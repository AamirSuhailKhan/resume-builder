import { JobOpportunity, HiringContact } from "@prisma/client";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";

export interface GeneratedEmailDraft {
  sequence: number;
  subject: string;
  body: string;
  delayDays: number;
  explainability: {
    reasoning: string;
    memorySourced: string[];
  };
}

export class CampaignIntelligenceService {
  async generateSequence(
    userId: string,
    job: JobOpportunity,
    contact: HiringContact | null,
    resumeData: any
  ): Promise<GeneratedEmailDraft[]> {
    const memories = await prisma.careerMemory.findMany({
      where: { userId },
      take: 5,
      orderBy: { confidence: "desc" },
    });

    const recruiterName = contact?.name || "Hiring Team";

    const prompt = `
    You are an expert career strategist crafting a highly personalized 3-email follow-up sequence.
    
    Target Job: ${job.role} at ${job.company}
    Target Recruiter: ${recruiterName}
    Job Description: ${job.description}
    
    Candidate Summary:
    ${resumeData.personal?.summary || "Experienced professional"}
    
    Candidate Memories / Highlights:
    ${memories.map(m => "- " + m.content).join("\n")}
    
    Generate exactly 3 emails in valid JSON format.
    Email 1 (Sequence 1, Day 4): Brief thank you, highlight one specific memory that perfectly aligns with the job.
    Email 2 (Sequence 2, Day 10): Add value. Share a quick insight or past project from the memory bank relevant to ${job.company}'s likely challenges.
    Email 3 (Sequence 3, Day 18): Graceful final follow-up, easy out, extremely polite.
    
    Format:
    {
      "emails": [
        {
          "sequence": number,
          "subject": "string",
          "body": "string (plain text, no placeholders, use real names)",
          "delayDays": number,
          "explainability": {
            "reasoning": "Why did you write this email this way?",
            "memorySourced": ["Which specific memories did you use?"]
          }
        }
      ]
    }
    `;

    const { data } = await callClaudeJson<{ emails: GeneratedEmailDraft[] }>({
      system: "You are a senior executive recruiter. Output ONLY valid JSON, nothing else.",
      user: prompt,
      maxTokens: 2000,
    });

    if (!Array.isArray(data.emails) || data.emails.length === 0) {
      throw new Error("Failed to generate intelligent email sequence.");
    }

    return data.emails;
  }
}
