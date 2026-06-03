import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import salaryBenchmarks from "@/lib/data/salary-benchmarks.json";
import { logger } from "@/lib/logger";

export interface ScamJobInfo {
  title: string;
  company: string;
  url?: string | null;
  description: string;
  salaryRange?: string | null;
  scamReports?: number;
}

export class ScamJobDetector {
  async detectScam(job: ScamJobInfo): Promise<{ score: number; signals: string[]; verdict: "safe" | "suspicious" | "scam" }> {
    let score = 0;
    const signals: string[] = [];
    const logs: string[] = [];

    // COMMUNITY REPORTS (Highest priority)
    const reports = job.scamReports || 0;
    if (reports >= 3) {
      return { score: 100, signals: ["Flagged as scam by community (3+ reports)"], verdict: "scam" };
    }
    if (reports >= 1) {
      score += 20;
      signals.push("Flagged as suspicious by community");
    }

    // 1. SALARY CHECK (max 20)
    let salaryScore = 0;
    const lowerTitle = job.title.toLowerCase();
    const benchmarkKey = Object.keys(salaryBenchmarks).find((k) => lowerTitle.includes(k));
    if (benchmarkKey && job.salaryRange) {
      // Very naive extraction of the first large number (assumed INR for India context if it's large)
      const match = job.salaryRange.match(/(\d{5,})/);
      if (match && match[1]) {
        const salaryVal = parseInt(match[1], 10);
        const benchmarkData = salaryBenchmarks as Record<string, { INR?: { median?: number } }>;
        const median = benchmarkData[benchmarkKey]?.INR?.median;
        if (median && salaryVal > median * 3) {
          salaryScore = 20;
          signals.push("Unrealistically high salary (3x+ market median)");
        } else if (median && salaryVal > median * 2) {
          salaryScore = 15;
          signals.push("Highly inflated salary (2x+ market median)");
        }
      }
    }
    score += salaryScore;

    // 2. URL CHECK
    const url = job.url || "";
    if (!url || url.includes("javascript:") || url === "#") {
      score += 15;
      signals.push("No valid application link provided");
    } else if (/whatsapp\.com|wa\.me|t\.me|telegram\.me/i.test(url)) {
      score += 25;
      signals.push("Application redirects to WhatsApp/Telegram (High Scam Risk)");
    } else if (/bit\.ly|tinyurl\.com|t\.ly|cutt\.ly|rebrand\.ly/i.test(url)) {
      score += 20;
      signals.push("Application uses a link shortener (Common in scams)");
    }

    // 3. REGEX HEURISTICS (Emails & Upfront Payments)
    const description = job.description || "";
    const lowerDesc = description.toLowerCase();
    
    // Free Email Providers for Recruiters
    if (/[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)/i.test(description)) {
      score += 15;
      signals.push("Recruiter uses a free email address (gmail/yahoo/etc) instead of company domain");
    }

    // Upfront payments
    if (/registration fee|security deposit|training fee|payment required|pay to work/i.test(description)) {
      score += 25;
      signals.push("Description mentions upfront payment or security deposit (Illegal)");
    }

    // 4. COMPANY VERIFICATION
    const suspiciousCompanyRegex = /earn|fast.*money|guaranteed|urgent.*hiring|data.*entry/i;
    if (suspiciousCompanyRegex.test(job.company)) {
      score += 10;
      signals.push("Company name contains suspicious keywords");
    }

    // Database check for company intelligence
    try {
      const companyIntel = await prisma.companyIntelligence.findUnique({
        where: { companyName: job.company },
      });
      if (!companyIntel) {
        score += 10;
        signals.push("Company has no verified intelligence profile");
      }
    } catch (err) {
      // ignore db errors
    }

    logs.push(`Heuristic score: ${score}`);

    // STAGE 2: AI ANALYSIS (Only if heuristic score >= 15)
    if (score >= 15) {
      const aiScore = await this.checkDescriptionWithAI(description);
      if (aiScore > 0) {
        score += aiScore * 3;
        signals.push("AI detected semantic scam indicators in job description");
        logs.push(`AI score applied: ${aiScore * 3}`);
      }
    } else {
      logs.push("Skipped AI analysis (heuristic score < 15)");
    }

    // CAP SCORE AT 100
    score = Math.min(100, Math.max(0, score));

    // DETERMINE VERDICT
    let verdict: "safe" | "suspicious" | "scam" = "safe";
    if (score >= 61) verdict = "scam";
    else if (score >= 26) verdict = "suspicious";

    logger.info({ score, verdict, signals, logs }, "[ScamJobDetector] Evaluated job");

    return { score, signals, verdict };
  }

  private async checkDescriptionWithAI(description: string): Promise<number> {
    if (!description || description.trim() === "") return 0;
    
    const cacheKey = `scam_ai:${createHash("sha256").update(description.substring(0, 500)).digest("hex")}`;
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get<number>(cacheKey);
        if (cached !== null) return cached;
      } catch (err) {
        // ignore redis errors
      }
    }

    try {
      const systemPrompt = `You are an expert fraud investigator for an Indian job platform. Evaluate the job description for scam indicators.
Look out for: guaranteed placement, upfront fees, work from home earn lakhs daily, no experience needed, MLM/network marketing, WhatsApp required, data entry earn 50k/month, URGENT HIRING.

Return ONLY a JSON object with a single key "scamScore" containing an integer from 0 to 10 (10 being highly fraudulent).
Example: {"scamScore": 8}`;

      const { data } = await callClaudeJson<{ scamScore: number }>({
        system: systemPrompt,
        user: `Job Description:\n${description.substring(0, 3000)}`,
        maxTokens: 100,
        // using default model, usually haiku or sonnet
      });

      const score = Math.min(10, Math.max(0, data?.scamScore || 0));

      if (redis) {
        // Cache for 30 days
        redis.set(cacheKey, score, { ex: 30 * 24 * 60 * 60 }).catch(() => {});
      }
      return score;
    } catch (error) {
      logger.warn({ error }, "[ScamJobDetector] AI check failed.");
      return 0;
    }
  }
}
