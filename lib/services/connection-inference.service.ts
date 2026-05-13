import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { GoogleGenAI } from "@google/genai";
import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

export interface ConnectionInferenceResult {
  type: string; // 'alumni' | 'previous_company' | 'mutual_connection' | 'direct'
  strength: number; // 0-1
  personName: string;
  personTitle: string | null;
  personCompany: string | null;
  sharedContext: string | null;
  linkedinSearchQuery: string | null;
  confidenceTier: string; // "inferred" | "speculative"
}

export class ConnectionInferenceService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async inferConnections(
    userId: string,
    jobCompany: string,
    jobRole: string
  ): Promise<ConnectionInferenceResult[]> {
    // 1. Gather user context
    const [memories, resume] = await Promise.all([
      prisma.careerMemory.findMany({
        where: { userId, type: "work_experience" },
      }),
      prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const previousCompanies: string[] = [];
    for (const mem of memories) {
      if (mem.metadata && typeof mem.metadata === "object" && "company" in mem.metadata) {
        if (typeof mem.metadata.company === "string") {
          previousCompanies.push(mem.metadata.company);
        }
      }
    }

    const universities: string[] = [];
    const skills: string[] = [];
    let summary = "";

    if (resume?.data) {
      const resumeData = resume.data as {
        education?: Array<{ institution?: string }>;
        skills?: string[];
        personal?: { summary?: string };
        personalInfo?: { summary?: string };
      };

      if (Array.isArray(resumeData.education)) {
        for (const edu of resumeData.education) {
          if (edu.institution) universities.push(edu.institution);
        }
      }
      if (Array.isArray(resumeData.skills)) {
        skills.push(...resumeData.skills);
      }
      summary = resumeData.personal?.summary || resumeData.personalInfo?.summary || "";
    }

    const userBackground = `Companies: ${previousCompanies.join(", ")} | Universities: ${universities.join(", ")} | Skills: ${skills.slice(0, 10).join(", ")} | Summary: ${summary}`;
    
    // 2. Cache check
    const cacheKey = `connections:v1:${createHash("sha256").update(userBackground + jobCompany + jobRole).digest("hex")}`;
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get<ConnectionInferenceResult[]>(cacheKey);
        if (cached) return cached;
      } catch (err) {
        logger.warn({ err }, "[ConnectionInferenceService] Redis get failed");
      }
    }

    // 3. AI Inference
    const systemPrompt = `You are a networking analyst. Given a person's career history and a target company, identify potential connection paths.
Return ONLY valid JSON in this exact format, with no markdown formatting or backticks:
[
  {
    "type": "alumni" | "previous_company" | "mutual_connection" | "direct",
    "strength": 0.0 to 1.0,
    "personName": "string (create a realistic placeholder name if speculative, e.g. 'Jane D.', 'Alex from Engineering')",
    "personTitle": "string",
    "personCompany": "string",
    "sharedContext": "string (Why am I seeing this? e.g. 'Both worked at Google 2019-2021')",
    "linkedinSearchQuery": "string (Search query to find this person on LinkedIn)",
    "confidenceTier": "inferred" | "speculative"
  }
]
Max 3 connections. Be realistic. If generating a speculative connection (e.g., someone with similar background), set confidenceTier to "speculative".`;

    const userPrompt = `Target company: ${jobCompany}
Target role: ${jobRole}
User's previous companies: ${previousCompanies.join(", ")}
User's universities: ${universities.join(", ")}
User's skills: ${skills.join(", ")}

Generate realistic connection paths as JSON array.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
        ]
      });

      let text = response.text || "[]";
      // Clean potential markdown formatting
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      const parsed = JSON.parse(text) as ConnectionInferenceResult[];
      
      if (redis && parsed.length > 0) {
        redis.set(cacheKey, parsed, { ex: 7 * 24 * 60 * 60 }).catch(() => {});
      }
      
      return parsed;
    } catch (error) {
      logger.error({ error, jobCompany }, "[ConnectionInferenceService] Failed to infer connections");
      return [];
    }
  }
}
