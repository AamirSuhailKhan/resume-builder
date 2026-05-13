import { ConnectionPath, JobOpportunity } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export class OutreachGenerationService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async generateMessage(
    userId: string,
    connectionPath: ConnectionPath,
    job: JobOpportunity,
    tone: "formal" | "casual" = "casual"
  ): Promise<string> {
    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    let summary = "";
    if (resume?.data) {
      const resumeData = resume.data as {
        personal?: { summary?: string };
        personalInfo?: { summary?: string };
      };
      summary = resumeData.personal?.summary || resumeData.personalInfo?.summary || "";
    }

    const systemPrompt = `Write a warm, personalized LinkedIn connection request or short email.
Maximum 300 words. Professional but human. Tone should be ${tone}.
Focus on being assistive and building a connection, not just asking for a job.
Do not include subject lines or placeholders like [Your Name]. Just write the message body.`;

    const userPrompt = `I want to reach out to ${connectionPath.personName} (${connectionPath.personTitle} at ${connectionPath.personCompany || job.company}) about the ${job.role} role.
My connection context: ${connectionPath.sharedContext}.
My background summary: ${summary}.

Write a message that mentions the shared connection naturally, shows genuine interest in their work or the company, and asks for a brief conversation or advice.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
        ]
      });

      return response.text?.trim() || "Hi, I noticed your profile and would love to connect to discuss opportunities.";
    } catch (error) {
      logger.error({ error, connectionId: connectionPath.id }, "[OutreachGenerationService] Failed to generate outreach");
      return "Hi, I noticed your profile and would love to connect to discuss opportunities.";
    }
  }
}
