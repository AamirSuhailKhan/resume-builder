import type { CompanyIntelligence, Prisma } from "@prisma/client";
import { callClaudeJson, getNumber, getString } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";

import { SearchItem, duckDuckGoSearch } from "@/lib/search/duckduckgo";

type CompanyIntelAi = {
  healthScore?: number;
  hiringVelocity?: string;
  fundingStage?: string | null;
  glassdoorRating?: number | null;
  recentNews?: Array<{ title?: string; summary?: string; sentiment?: string; date?: string; url?: string }>;
  interviewProcess?: { rounds?: number; difficulty?: string; avgDays?: number; format?: string };
  cultureSignals?: { wlb?: number; management?: number; growth?: number };
  layoffRisk?: string;
  healthScoreRationale?: string;
};

const CACHE_TTL_SECONDS = 48 * 60 * 60;

function normalizeCompanyName(companyName: string) {
  return companyName.trim().replace(/\s+/g, " ");
}

function cacheKey(companyName: string) {
  return `company_intel:${companyName.toLowerCase()}`;
}



type CompanyIntelInput = Omit<Prisma.CompanyIntelligenceUncheckedCreateInput, "id" | "createdAt">;

function fallbackIntel(companyName: string, companyDomain: string | undefined, searchItems: SearchItem[]): CompanyIntelInput {
  const negativeText = searchItems.map((item) => item.summary.toLowerCase()).join(" ");
  const layoffRisk = negativeText.includes("layoff") || negativeText.includes("restructur") ? "medium" : "unknown";
  const healthScore = layoffRisk === "medium" ? 48 : 58;

  return {
    companyName,
    companyDomain: companyDomain ?? null,
    healthScore,
    hiringVelocity: "unknown",
    fundingStage: null,
    employeeCount: null,
    glassdoorRating: null,
    recentNews: searchItems.slice(0, 3).map((item) => ({
      title: item.title,
      summary: item.summary,
      sentiment: "neutral",
      date: new Date().toISOString().slice(0, 10),
      ...(item.url ? { url: item.url } : {}),
    })) as Prisma.InputJsonValue[],
    interviewProcess: {
      rounds: null,
      difficulty: "unknown",
      avgDays: null,
      format: "Limited public information",
    },
    cultureSignals: { wlb: 50, management: 50, growth: 50 },
    layoffRisk,
    scamRisk: "unknown",
    scamSignals: { signals: ["Limited public information"] },
    lastRefreshedAt: new Date(),
  };
}

export class CompanyIntelligenceService {
  static async generateReport(companyName: string, companyDomain?: string): Promise<CompanyIntelligence> {
    const normalized = normalizeCompanyName(companyName);
    if (!normalized) throw new Error("Company name is required.");

    const freshCutoff = new Date(Date.now() - CACHE_TTL_SECONDS * 1000);
    const existing = await prisma.companyIntelligence.findUnique({ where: { companyName: normalized } });
    if (existing && existing.lastRefreshedAt > freshCutoff) return existing;

    const redis = getRedisClient();
    const cached = await redis?.get<CompanyIntelligence>(cacheKey(normalized)).catch(() => null);
    if (cached) return cached;

    const queries = [
      `${normalized} layoffs 2024 2025`,
      `${normalized} funding announcement 2024`,
      `${normalized} glassdoor rating reviews`,
      `${normalized} interview process rounds experience`,
    ];

    const [layoffs = [], funding = [], ratings = [], process = []] = await Promise.all(queries.map(duckDuckGoSearch));
    const searchItems = [...layoffs, ...funding, ...ratings, ...process];

    let data = fallbackIntel(normalized, companyDomain, searchItems);
    try {
      const { data: ai } = await callClaudeJson<CompanyIntelAi>({
        system: "Analyze company intelligence data and return ONLY valid JSON.",
        user: JSON.stringify({
          company: normalized,
          researchData: searchItems,
          requiredShape: {
            healthScore: "0-100",
            hiringVelocity: "growing|stable|shrinking|unknown",
            fundingStage: "string|null",
            glassdoorRating: "number|null",
            recentNews: [{ title: "string", summary: "string", sentiment: "positive|negative|neutral", date: "string" }],
            interviewProcess: { rounds: "number|null", difficulty: "easy|medium|hard|unknown", avgDays: "number|null", format: "string" },
            cultureSignals: { wlb: "0-100", management: "0-100", growth: "0-100" },
            layoffRisk: "low|medium|high|unknown",
            healthScoreRationale: "string",
          },
        }),
        maxTokens: 2200,
      });

      data = {
        ...data,
        healthScore: Math.max(0, Math.min(100, getNumber(ai.healthScore, data.healthScore))),
        hiringVelocity: getString(ai.hiringVelocity) || data.hiringVelocity,
        fundingStage: ai.fundingStage ? getString(ai.fundingStage) : null,
        glassdoorRating: typeof ai.glassdoorRating === "number" ? ai.glassdoorRating : null,
        recentNews: Array.isArray(ai.recentNews) && ai.recentNews.length > 0
          ? ai.recentNews.slice(0, 5).map((item) => ({
              title: getString(item.title) || "Company update",
              summary: getString(item.summary) || "Limited public detail available.",
              sentiment: getString(item.sentiment) || "neutral",
              date: getString(item.date) || new Date().toISOString().slice(0, 10),
              ...(getString(item.url) ? { url: getString(item.url) } : {}),
            })) as Prisma.InputJsonValue[]
          : data.recentNews ?? [],
        interviewProcess: ai.interviewProcess as Prisma.InputJsonValue ?? data.interviewProcess,
        cultureSignals: ai.cultureSignals as Prisma.InputJsonValue ?? data.cultureSignals,
        layoffRisk: getString(ai.layoffRisk) || data.layoffRisk,
      };
    } catch {
      // Keep fallback; public data can be sparse.
    }

    const scam = await this.computeScamScore(normalized, companyDomain);
    const record = await prisma.companyIntelligence.upsert({
      where: { companyName: normalized },
      create: {
        ...data,
        scamRisk: scam.risk,
        scamSignals: { signals: scam.signals },
      },
      update: {
        ...data,
        scamRisk: scam.risk,
        scamSignals: { signals: scam.signals },
        lastRefreshedAt: new Date(),
      },
    });

    await redis?.set(cacheKey(normalized), record, { ex: CACHE_TTL_SECONDS }).catch(() => undefined);
    return record;
  }

  static async computeScamScore(companyName: string, domain?: string, jobUrl?: string): Promise<{ risk: string; signals: string[] }> {
    const signals: string[] = [];
    let score = 0;

    if (domain) {
      try {
        const response = await fetch(domain.startsWith("http") ? domain : `https://${domain}`, { method: "HEAD" });
        if (!response.ok) {
          score += 15;
          signals.push("Company domain could not be verified");
        }
      } catch {
        score += 20;
        signals.push("Company domain did not respond");
      }
    } else {
      score += 10;
      signals.push("No company domain provided");
    }

    if (jobUrl && domain) {
      try {
        const jobHost = new URL(jobUrl).hostname.replace(/^www\./, "");
        const companyHost = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
        if (companyHost && !jobHost.endsWith(companyHost)) {
          score += 20;
          signals.push("Job URL domain differs from company domain");
        }
      } catch {
        score += 10;
      }
    }

    const linkedinResults = await duckDuckGoSearch(`${companyName} LinkedIn company`);
    if (linkedinResults.length === 0) {
      score += 20;
      signals.push("No LinkedIn company signal found in public search");
    }

    if (score >= 60) return { risk: "scam", signals };
    if (score >= 25) return { risk: "suspicious", signals };
    return { risk: "safe", signals: signals.length > 0 ? signals : ["Public company signals look normal"] };
  }
}
