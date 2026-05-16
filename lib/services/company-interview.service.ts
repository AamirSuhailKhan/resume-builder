import type { CompanyInterviewBrief, Prisma } from "@prisma/client";
import { callClaudeJson, getNumber, getString } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";

type BriefAi = {
  rounds?: number;
  roundDescriptions?: Array<{ round?: number; type?: string; duration?: string; notes?: string }>;
  questionThemes?: string[];
  knownQuestions?: string[];
  difficulty?: string;
  avgTimelineDays?: number;
  offerAcceptRate?: number | null;
  interviewTips?: string[];
};

const STATIC_BRIEFS: Record<string, BriefAi> = {
  google: {
    rounds: 5,
    roundDescriptions: [
      { round: 1, type: "recruiter screen", duration: "30min", notes: "Role fit and logistics." },
      { round: 2, type: "technical coding", duration: "45min", notes: "Data structures and algorithms." },
      { round: 3, type: "system design", duration: "45min", notes: "Architecture tradeoffs for senior candidates." },
    ],
    questionThemes: ["DSA medium", "system design", "behavioral"],
    knownQuestions: ["Design a URL shortener", "Find the longest substring without repeats"],
    difficulty: "hard",
    avgTimelineDays: 35,
    interviewTips: ["Practice explaining tradeoffs aloud.", "Use examples with measurable impact."],
  },
  flipkart: {
    rounds: 4,
    roundDescriptions: [
      { round: 1, type: "technical screen", duration: "60min", notes: "Problem solving and fundamentals." },
      { round: 2, type: "machine coding", duration: "90min", notes: "Clean design under time pressure." },
    ],
    questionThemes: ["machine coding", "DSA", "low-level design"],
    knownQuestions: ["Design an in-memory cache", "Build a parking lot model"],
    difficulty: "medium",
    avgTimelineDays: 21,
    interviewTips: ["Keep code modular.", "Clarify requirements before solving."],
  },
};

function normalizeCompany(companyName: string) {
  return companyName.trim().toLowerCase().replace(/\s+/g, " ");
}

async function search(query: string) {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  const response = await fetch(url);
  if (!response.ok) return "";
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  return [payload?.AbstractText, payload?.Heading].map(getString).filter(Boolean).join("\n");
}

function normalizeBrief(companyName: string, source: BriefAi): Prisma.CompanyInterviewBriefCreateInput {
  return {
    companyName,
    rounds: typeof source.rounds === "number" ? source.rounds : 3,
    roundDescriptions: (source.roundDescriptions ?? [
      { round: 1, type: "screen", duration: "30min", notes: "General fit and experience discussion." },
      { round: 2, type: "technical", duration: "45min", notes: "Role-relevant technical depth." },
    ]) as Prisma.InputJsonValue[],
    questionThemes: (source.questionThemes ?? ["behavioral", "technical depth", "role fit"]).map(String),
    knownQuestions: (source.knownQuestions ?? []).map(String).slice(0, 5),
    difficulty: getString(source.difficulty) || "medium",
    avgTimelineDays: Math.round(getNumber(source.avgTimelineDays, 21)),
    offerAcceptRate: typeof source.offerAcceptRate === "number" ? source.offerAcceptRate : null,
    interviewTips: (source.interviewTips ?? [
      "Prepare candidate-reported themes, but do not assume exact repeat questions.",
      "Use structured answers with tradeoffs and measurable outcomes.",
    ]).map(String),
    lastUpdated: new Date(),
  };
}

export class CompanyInterviewService {
  static async getOrGenerateBrief(companyName: string): Promise<CompanyInterviewBrief> {
    const normalized = normalizeCompany(companyName);
    if (!normalized) throw new Error("Company name is required.");

    const freshCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existing = await prisma.companyInterviewBrief.findUnique({ where: { companyName: normalized } });
    if (existing && existing.lastUpdated > freshCutoff) return existing;

    const redis = getRedisClient();
    const key = `interview_brief:${normalized}`;
    const cached = await redis?.get<CompanyInterviewBrief>(key).catch(() => null);
    if (cached) return cached;

    let source = STATIC_BRIEFS[normalized] ?? {};
    try {
      const research = await Promise.all([
        search(`${normalized} interview process rounds 2024 site:glassdoor.com`),
        search(`${normalized} interview experience software engineer blind`),
        search(`${normalized} interview questions leetcode`),
      ]);

      const { data } = await callClaudeJson<BriefAi>({
        system: "Extract structured interview information from search results. Return ONLY valid JSON.",
        user: JSON.stringify({
          company: normalized,
          research: research.filter(Boolean).join("\n\n"),
          instruction: "Use candidate-reported themes only. Never claim these are guaranteed exact questions.",
        }),
        maxTokens: 1800,
      });
      source = { ...source, ...data };
    } catch {
      // Static fallback or generic normalized brief is good enough.
    }

    const record = await prisma.companyInterviewBrief.upsert({
      where: { companyName: normalized },
      create: normalizeBrief(normalized, source),
      update: normalizeBrief(normalized, source),
    });
    await redis?.set(key, record, { ex: 7 * 24 * 60 * 60 }).catch(() => undefined);
    return record;
  }
}
