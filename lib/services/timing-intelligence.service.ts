import hiringPatterns from "@/lib/data/hiring-patterns.json";
import { prisma } from "@/lib/db/prisma";

export type TimingAdvice = {
  recommendation: "apply_now" | "apply_soon" | "wait";
  urgency: string;
  bestWindowDays: number;
  reasoning: string;
  fillSpeedDays: number | null;
};

type CompanyType = "startup_seed" | "startup_growth" | "enterprise" | "public_company" | "faang";

type HiringPatternData = {
  bestMonths: number[];
  worstMonths: number[];
  avgDaysToFill?: number;
  hiringCyclePeak?: string;
  notes?: string;
};

const FAANG = new Set(["google", "alphabet", "meta", "facebook", "amazon", "apple", "netflix", "microsoft"]);
const ENTERPRISE = new Set(["ibm", "oracle", "salesforce", "sap", "adobe", "accenture", "infosys", "tcs", "wipro"]);

function inferCompanyType(company: string, companyType?: string): CompanyType {
  if (companyType && companyType in hiringPatterns) return companyType as CompanyType;
  const normalized = company.toLowerCase();
  if (FAANG.has(normalized)) return "faang";
  if (ENTERPRISE.has(normalized)) return "enterprise";
  if (["inc", "corp", "technologies"].some((suffix) => normalized.includes(suffix))) return "public_company";
  return "startup_growth";
}

function monthDistance(from: number, to: number) {
  return (to - from + 12) % 12;
}

export class TimingIntelligenceService {
  static async getTimingAdvice(job: { company: string; companyType?: string; industry: string; postedAt: Date }): Promise<TimingAdvice> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const companyType = inferCompanyType(job.company, job.companyType);

    const dbPattern = await prisma.hiringPattern.findFirst({
      where: {
        companyType,
        industry: { equals: job.industry || "tech", mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
    }).catch(() => null);

    const staticPattern = hiringPatterns[companyType] as HiringPatternData;
    const pattern = dbPattern ?? staticPattern;
    const bestMonths = "bestMonths" in pattern ? pattern.bestMonths : staticPattern.bestMonths;
    const worstMonths = "worstMonths" in pattern ? pattern.worstMonths : staticPattern.worstMonths;
    const fillSpeedDays = ("avgDaysToFill" in pattern ? pattern.avgDaysToFill : staticPattern.avgDaysToFill) ?? null;
    const notes = ("notes" in pattern ? pattern.notes : staticPattern.notes) ?? "Based on historical hiring calendar patterns.";

    let recommendation: TimingAdvice["recommendation"] = "apply_soon";
    let urgency = "Medium";
    let reasoning = `Hiring timing is mixed for this company type; ${notes}`;
    let bestWindowDays = 14;

    if (bestMonths.includes(currentMonth)) {
      recommendation = "apply_now";
      urgency = "High";
      bestWindowDays = 3;
      reasoning = `Apply now: this is typically a stronger hiring month for ${companyType.replace("_", " ")} companies, based on historical patterns. ${notes}`;
    } else if (bestMonths.some((month) => monthDistance(currentMonth, month) > 0 && monthDistance(currentMonth, month) <= 2)) {
      recommendation = "apply_soon";
      urgency = "Medium";
      bestWindowDays = 7;
      reasoning = `Apply this week: hiring typically picks up soon for this company type, based on historical patterns. ${notes}`;
    } else if (worstMonths.includes(currentMonth)) {
      recommendation = "wait";
      urgency = "Low";
      bestWindowDays = 21;
      reasoning = `Hiring typically slows this time of year for this company type, based on historical patterns. Still apply if the role is a strong fit.`;
    }

    const ageDays = Math.floor((now.getTime() - job.postedAt.getTime()) / 86_400_000);
    if (ageDays > 45) {
      recommendation = "apply_now";
      urgency = "Medium";
      reasoning += " This role has been open a long time: it may still be unfilled, but verify freshness before investing deeply.";
    }

    return { recommendation, urgency, bestWindowDays, reasoning, fillSpeedDays };
  }
}
