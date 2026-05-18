import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { meilisearch, JOBS_INDEX } from "@/lib/search/meilisearch";
import { duckDuckGoSearch } from "@/lib/search/duckduckgo";
import { callClaudeJson, getString, getNumber } from "@/app/api/interview/_lib/claude";
import type { MarketWeatherReport, Prisma } from "@prisma/client";

function getIsoWeekAndYear(date: Date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return {
    year: target.getFullYear(),
    week: 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  };
}

const CACHE_TTL_SECONDS = 24 * 60 * 60;

type MarketWeatherAi = {
  hiringTrend: string;
  trendPct: number;
  hotSkills: string[];
  fastFillRoles: string[];
  avgDaysToFill: number;
  salaryTrend: string;
  topHiringCompanies: string[];
  headline: string;
  detailedSummary: string;
  confidenceScore: number;
  signalStrength: string;
  signalMetadata: Record<string, unknown>;
};

export class MarketWeatherService {
  static async generateWeeklyReport(
    role: string,
    industry: string,
    location: string
  ): Promise<{ report: MarketWeatherReport; fromCache: boolean }> {
    const { week, year } = getIsoWeekAndYear(new Date());

    // 1. Check existing report for current ISO week
    const existing = await prisma.marketWeatherReport.findUnique({
      where: {
        week_year_role_industry_location: {
          week,
          year,
          role,
          industry,
          location
        }
      }
    });

    if (existing) {
      return { report: existing, fromCache: true };
    }

    const redis = getRedisClient();
    const lockKey = `lock:market:${week}:${year}:${role}:${industry}:${location}`;

    if (redis) {
      const locked = await redis.set(lockKey, "1", { nx: true, ex: 120 });
      if (!locked) {
        // Simple polling wait for another instance to finish
        for (let i = 0; i < 10; i++) {
          await new Promise((res) => setTimeout(res, 2000));
          const check = await prisma.marketWeatherReport.findUnique({
            where: {
              week_year_role_industry_location: {
                week,
                year,
                role,
                industry,
                location
              }
            }
          });
          if (check) return { report: check, fromCache: true };
        }
      }
    }

    try {
      // 2. Gather internal signals from Meilisearch
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

      let thisWeekJobsCount = 0;
      let lastWeekJobsCount = 0;

      try {
        const thisWeekJobs = await meilisearch.index(JOBS_INDEX).search(role, {
          filter: [`postedAt >= ${sevenDaysAgo}`],
          limit: 0
        });
        const lastWeekJobs = await meilisearch.index(JOBS_INDEX).search(role, {
          filter: [`postedAt >= ${fourteenDaysAgo}`, `postedAt < ${sevenDaysAgo}`],
          limit: 0
        });

        thisWeekJobsCount = thisWeekJobs.estimatedTotalHits || 0;
        lastWeekJobsCount = lastWeekJobs.estimatedTotalHits || 0;
      } catch (err) {
        console.error("[MarketWeather] Failed to fetch Meilisearch signals", err);
      }

      // Safe calculation of trend percentage
      const trendPctInternal =
        lastWeekJobsCount > 0
          ? ((thisWeekJobsCount - lastWeekJobsCount) / lastWeekJobsCount) * 100
          : thisWeekJobsCount > 0
            ? 100
            : 0;

      // 3. Web research
      const query = `${role} jobs ${location} hiring trends ${year}`;
      const searchItems = await duckDuckGoSearch(query);
      const searchSummary = searchItems.map((s) => s.summary).join(" | ");

      // 4. Fallback if very low signal
      const lowSignal = thisWeekJobsCount < 5 && searchItems.length === 0;

      let aiResult = null;
      try {
        // 5. Call Claude JSON
        aiResult = await callClaudeJson<MarketWeatherAi>({
          system: "Generate a job market weather report based on the provided internal analytics and external web research. Return ONLY valid JSON.",
          user: `
Role: ${role}
Industry: ${industry}
Location: ${location}

INTERNAL DATA:
- Jobs posted this week: ${thisWeekJobsCount}
- Jobs posted last week: ${lastWeekJobsCount}

EXTERNAL WEB RESEARCH:
${searchSummary}

INSTRUCTIONS:
Synthesize the data into a market report. If internal data is extremely low (< 5), rely more on external research or state uncertainty. The hiringTrend must be one of: surging, growing, stable, declining, frozen. Detailed summary must be plain text prose (no markdown). Ensure confidenceScore (0 to 1) reflects data sufficiency.

Return JSON shape:
{
  "hiringTrend": "surging|growing|stable|declining|frozen",
  "trendPct": number, // Overall trend %
  "hotSkills": ["skill1", "skill2"],
  "fastFillRoles": ["role1", "role2"],
  "avgDaysToFill": number,
  "salaryTrend": "string",
  "topHiringCompanies": ["company1", "company2"],
  "headline": "One sentence prominent headline",
  "detailedSummary": "Detailed prose, 3 paragraphs, plain text",
  "confidenceScore": number, // 0.0 to 1.0
  "signalStrength": "High|Medium|Low",
  "signalMetadata": {
     "internalJobs": number,
     "webSources": number,
     "trendStrength": number
  }
}
          `,
          maxTokens: 2000,
        });
      } catch (error) {
        console.error("[MARKET WEATHER AI ERROR]", error);
      }

      let ai = aiResult?.data;

      if (!ai) {
        ai = {
          hiringTrend:
            trendPctInternal > 15
              ? "surging"
              : trendPctInternal > 5
              ? "growing"
              : trendPctInternal < -10
              ? "declining"
              : "stable",
          trendPct: trendPctInternal,
          hotSkills: ["TypeScript", "React", "Node.js"],
          fastFillRoles: [role],
          avgDaysToFill: 18,
          salaryTrend: trendPctInternal > 0 ? "increasing" : "stable",
          topHiringCompanies: [],
          headline: `${role} hiring in ${location} is ${trendPctInternal > 0 ? "growing" : "stable"}.`,
          detailedSummary: `The ${role} market in ${location} currently shows ${trendPctInternal > 0 ? "positive" : "stable"} hiring momentum based on internal job activity.`,
          confidenceScore: 0.5,
          signalStrength: "Medium",
          signalMetadata: {
             internalJobs: thisWeekJobsCount,
             webSources: searchItems.length,
             trendStrength: trendPctInternal
          }
        } as unknown as MarketWeatherAi;
      }

      const reportData = {
        week,
        year,
        role,
        industry,
        location,
        hiringTrend: lowSignal ? "unknown" : getString(ai.hiringTrend) || "stable",
        trendPct: getNumber(ai.trendPct, trendPctInternal),
        hotSkills: Array.isArray(ai.hotSkills) ? ai.hotSkills.map(getString).filter(Boolean) as string[] : [],
        fastFillRoles: Array.isArray(ai.fastFillRoles) ? ai.fastFillRoles.map(getString).filter(Boolean) as string[] : [],
        avgDaysToFill: getNumber(ai.avgDaysToFill, 30),
        salaryTrend: getString(ai.salaryTrend) || "Stable",
        topHiringCompanies: Array.isArray(ai.topHiringCompanies) ? ai.topHiringCompanies.map(getString).filter(Boolean) as string[] : [],
        headline: getString(ai.headline) || `Market weather for ${role} in ${location}`,
        detailedSummary: getString(ai.detailedSummary) || "Insufficient data to generate a detailed summary at this time.",
        confidenceScore: getNumber(ai.confidenceScore, lowSignal ? 0.2 : 0.7),
        signalStrength: getString(ai.signalStrength) || (lowSignal ? "Low" : "Medium"),
        signalMetadata: ai.signalMetadata as Prisma.InputJsonValue ?? {
          internalJobs: thisWeekJobsCount,
          webSources: searchItems.length,
          trendStrength: trendPctInternal,
        },
      };

      const newReport = await prisma.marketWeatherReport.upsert({
        where: {
          week_year_role_industry_location: { week, year, role, industry, location }
        },
        create: reportData,
        update: reportData,
      });

      return { report: newReport, fromCache: false };
    } finally {
      if (redis) await redis.del(lockKey).catch(() => {});
    }
  }
}
