import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import salaryBenchmarks from "@/lib/data/salary-benchmarks.json";
import { checkDailyRateLimit } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  jobTitle: z.string().min(2).max(160),
  companyName: z.string().min(1).max(160),
  offerBase: z.number().positive(),
  offerEquity: z.string().max(500).optional(),
  offerBonus: z.number().nonnegative().optional(),
  offerBenefits: z.unknown().optional(),
  location: z.string().max(160).optional(),
  currency: z.enum(["INR", "USD", "EUR"]).default("INR"),
});

type Currency = "INR" | "USD" | "EUR";
type Benchmark = { min: number; median: number; max: number };
type Analysis = {
  marketAnalysis: { min: number; max: number; median: number; percentile: number };
  leverage: string[];
  risks: string[];
  counterOffers: {
    conservative: { amount: number; script: string; emailDraft: string };
    standard: { amount: number; script: string; emailDraft: string };
    aggressive: { amount: number; script: string; emailDraft: string };
  };
  walkawayNumber: number;
  timing: string;
  redFlags: string[];
};

function getBenchmark(jobTitle: string, currency: Currency): Benchmark {
  const key = Object.keys(salaryBenchmarks).find((role) => jobTitle.toLowerCase().includes(role));
  const fallback = salaryBenchmarks["software engineer" as keyof typeof salaryBenchmarks];
  const benchmark = (key ? salaryBenchmarks[key as keyof typeof salaryBenchmarks] : fallback) as Record<string, Benchmark>;
  return benchmark[currency] ?? benchmark.INR ?? { min: 900000, median: 1800000, max: 3800000 };
}

function fallbackAnalysis(input: z.infer<typeof requestSchema>, market: Benchmark): Analysis {
  const percentile = Math.round(((input.offerBase - market.min) / Math.max(1, market.max - market.min)) * 100);
  const standard = Math.max(input.offerBase * 1.12, market.median * 1.04);
  const script = `Thank you for the offer. Based on the role scope and market data for ${input.jobTitle}, I would be more comfortable at {amount}. I am excited about ${input.companyName} and would love to find a package that reflects the impact expected.`;
  const make = (amount: number) => ({
    amount: Math.round(amount),
    script: script.replace("{amount}", `${input.currency} ${Math.round(amount).toLocaleString("en-IN")}`),
    emailDraft: `Hi team,\n\nThank you again for the offer. I am excited about the opportunity at ${input.companyName}. After reviewing the role scope and market benchmarks, would you be open to revisiting the base to ${input.currency} ${Math.round(amount).toLocaleString("en-IN")}?\n\nBest,\n`,
  });

  return {
    marketAnalysis: { min: market.min, max: market.max, median: market.median, percentile: Math.max(0, Math.min(100, percentile)) },
    leverage: ["Role-specific skills match the position", "Market median is a useful anchor", "You can negotiate without inventing competing offers"],
    risks: ["Aggressive asks may slow the process", "Benefits and growth should be weighed alongside base salary"],
    counterOffers: {
      conservative: make(input.offerBase * 1.07),
      standard: make(standard),
      aggressive: make(Math.min(market.max, input.offerBase * 1.22)),
    },
    walkawayNumber: Math.round(Math.max(market.min, market.median * 0.9)),
    timing: "Negotiate after expressing enthusiasm and before accepting verbally.",
    redFlags: ["Do not claim competing offers unless they are real."],
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkDailyRateLimit(userId, 10, "negotiation_analyze");
  if (!limited.allowed) return NextResponse.json({ error: "Daily negotiation analysis limit reached." }, { status: 429 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  const input = parsed.data;
  const market = getBenchmark(input.jobTitle, input.currency);

  let analysis = fallbackAnalysis(input, market);
  try {
    const { data } = await callClaudeJson<Analysis>({
      system: "You are an expert salary negotiation coach with 10 years in tech recruiting. Return ONLY valid JSON.",
      user: JSON.stringify({
        job: `${input.jobTitle} at ${input.companyName} in ${input.location ?? "unspecified"}`,
        offer: { currency: input.currency, base: input.offerBase, equity: input.offerEquity, bonus: input.offerBonus },
        marketData: market,
        requiredShape: "marketAnalysis, leverage, risks, counterOffers conservative/standard/aggressive, walkawayNumber, timing, redFlags",
      }),
      maxTokens: 2500,
    });
    analysis = data;
  } catch {
    // Fallback strategy is deterministic and intentionally conservative.
  }

  const record = await prisma.negotiationSession.create({
    data: {
      userId,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      offerBase: input.offerBase,
      offerEquity: input.offerEquity ?? null,
      offerBonus: input.offerBonus ?? null,
      offerBenefits: input.offerBenefits === undefined ? Prisma.JsonNull : input.offerBenefits as Prisma.InputJsonValue,
      location: input.location ?? null,
      currency: input.currency,
      marketMin: analysis.marketAnalysis.min,
      marketMax: analysis.marketAnalysis.max,
      marketMedian: analysis.marketAnalysis.median,
      counterScript: analysis.counterOffers as unknown as Prisma.InputJsonValue,
      negotiationLog: [],
      outcome: "pending",
    },
  });

  return NextResponse.json({
    sessionId: record.id,
    marketAnalysis: analysis.marketAnalysis,
    counterOffers: analysis.counterOffers,
    walkawayNumber: analysis.walkawayNumber,
    leverage: analysis.leverage,
    risks: analysis.risks,
    redFlags: analysis.redFlags,
    timing: analysis.timing,
  });
}
