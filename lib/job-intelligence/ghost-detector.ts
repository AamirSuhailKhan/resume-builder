import { JobOpportunity } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import { GoogleGenAI } from "@google/genai";
import { JobsSearchService } from "@/lib/search/jobs.search";
import { logger } from "@/lib/logger";

export interface CompanySignals {
  recentLayoffs?: boolean;
  hiringFreeze?: boolean;
}

export class GhostJobDetector {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async score(
    job: JobOpportunity,
    companyData?: CompanySignals
  ): Promise<{
    score: number;
    signals: string[];
    verdict: "real" | "suspicious" | "ghost";
  }> {
    let ghostScore = 0;
    const signals: string[] = [];

    // Extract postedAt from parsed JSON if it exists, fallback to createdAt
    const parsed = job.parsed as { postedAt?: string } | null;
    const postedAt = parsed?.postedAt ? new Date(parsed.postedAt) : job.createdAt;

    // SIGNAL 1: Age (0-35 points)
    const daysSincePosted = differenceInDays(new Date(), postedAt);
    if (daysSincePosted > 90) {
      ghostScore += 35;
      signals.push(`Extremely old posting (>90 days)`);
    } else if (daysSincePosted > 60) {
      ghostScore += 25;
      signals.push(`Very old posting (>60 days)`);
    } else if (daysSincePosted > 45) {
      ghostScore += 15;
      signals.push(`Stale posting (>45 days)`);
    } else if (daysSincePosted > 30) {
      ghostScore += 8;
      signals.push(`Aging posting (>30 days)`);
    }

    // SIGNAL 2: No application URL (0-20 points)
    const url = job.sourceUrl || "";
    if (!url || url.includes("javascript:") || url === "#") {
      ghostScore += 20;
      signals.push("Missing or invalid application URL");
    } else if (
      !url.includes("apply") &&
      !url.includes("jobs") &&
      !url.includes("careers")
    ) {
      ghostScore += 5;
      signals.push("Non-standard application URL");
    }

    // SIGNAL 3: Generic/recycled description (0-20 points)
    const genericScore = await this.checkGenericDescription(job.description);
    if (genericScore > 0) {
      ghostScore += genericScore * 2; // max 20
      if (genericScore >= 7) {
        signals.push("Highly generic/templated description detected");
      }
    }

    // SIGNAL 4: Duplicate detection (0-15 points)
    try {
      // Find similar jobs via meilisearch/postgres
      const similarJobs = await JobsSearchService.searchDeep({
        query: `${job.role} ${job.company}`,
        limit: 10,
      });
      // We only count others (filter out this one just in case)
      const duplicates = similarJobs.filter(
        (j) => j.company.toLowerCase() === job.company.toLowerCase() && j.id !== job.id
      );
      
      if (duplicates.length >= 2) {
        ghostScore += 15;
        signals.push(`Multiple similar postings found for this company`);
      }
    } catch (err) {
      logger.warn({ err }, "[GhostJobDetector] Failed duplicate search check.");
    }

    // SIGNAL 5: Company signals (0-10 points)
    if (companyData?.recentLayoffs) {
      ghostScore += 7;
      signals.push("Company recently had layoffs");
    }
    if (companyData?.hiringFreeze) {
      ghostScore += 10;
      signals.push("Company is under a hiring freeze");
    }

    // Cap at 100
    ghostScore = Math.min(100, Math.max(0, ghostScore));

    let verdict: "real" | "suspicious" | "ghost" = "real";
    if (ghostScore >= 61) verdict = "ghost";
    else if (ghostScore >= 26) verdict = "suspicious";

    return { score: ghostScore, signals, verdict };
  }

  private async checkGenericDescription(description: string): Promise<number> {
    if (!description || description.trim() === "") return 5; // Default middle score if empty
    if (!process.env.GEMINI_API_KEY) return 0; // Skip if no API key

    const cacheKey = `ghost:desc:${createHash("sha256").update(description).digest("hex")}`;
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get<number>(cacheKey);
        if (cached !== null) return cached;
      } catch (err) {
        // ignore
      }
    }

    try {
      const prompt = `Does this job description use heavily templated/generic language with no specific team details, tech stack, or culture signals?
Score 0-10, where 10 means extremely generic/templated and 0 means highly specific and authentic.
Return ONLY a single number from 0 to 10.

Job Description:
${description.substring(0, 3000)}`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const numMatch = text.match(/\b([0-9]|10)\b/);
      const score = numMatch ? parseInt(numMatch[1] || "0", 10) : 0;

      if (redis) {
        // Cache for 24 hours
        redis.set(cacheKey, score, { ex: 24 * 60 * 60 }).catch(() => {});
      }
      return score;
    } catch (error) {
      logger.warn({ error }, "[GhostJobDetector] AI check failed.");
      return 0;
    }
  }
}
