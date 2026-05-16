import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import type { OfferAnalysis, OfferInput, OfferPriorities, ProcessedOffer } from "@/types/offers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const offerSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  base: z.number().positive(),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  equity: z.object({
    type: z.enum(["rsu", "options", "esop", "none"]),
    shares: z.number().optional(),
    strikePrice: z.number().optional(),
    currentFMV: z.number().optional(),
    vestingYears: z.number().optional(),
    cliffMonths: z.number().optional(),
    companyValuation: z.number().optional(),
    lastRoundPricePerShare: z.number().optional(),
  }).optional(),
  bonus: z.number().optional(),
  benefits: z.object({
    healthInsurance: z.boolean(),
    pf: z.boolean(),
    gratuity: z.boolean(),
    remoteFriendly: z.boolean(),
    stockRefresher: z.boolean(),
    learningBudget: z.number(),
  }),
  location: z.string(),
  workMode: z.enum(["remote", "hybrid", "onsite"]),
  companyStage: z.enum(["seed", "series_a", "series_b", "growth", "public", "enterprise"]),
  notes: z.string().optional(),
});

const prioritiesSchema = z.object({
  compensation: z.number().min(0).max(10),
  growth: z.number().min(0).max(10),
  stability: z.number().min(0).max(10),
  workLife: z.number().min(0).max(10),
}).refine((value) => value.compensation + value.growth + value.stability + value.workLife > 0, {
  message: "At least one priority must be greater than zero.",
});

const requestSchema = z.object({
  offers: z.array(offerSchema).min(2).max(6),
  priorities: prioritiesSchema,
});

const stageGrowth = { seed: 40, series_a: 55, series_b: 65, growth: 75, public: 70, enterprise: 60 };
const stageStability = { seed: 30, series_a: 45, series_b: 60, growth: 70, public: 80, enterprise: 90 };

function equityValues(offer: OfferInput) {
  if (!offer.equity || offer.equity.type === "none") return { conservative: 0, optimistic: 0 };
  const shares = offer.equity.shares ?? 0;
  const strike = offer.equity.strikePrice ?? 0;
  const current = offer.equity.currentFMV ?? offer.equity.lastRoundPricePerShare ?? strike;
  const conservative = strike >= current ? 0 : Math.max(0, shares * strike * 2 - shares * strike);
  const optimistic = Math.max(0, shares * current * 3 - shares * strike);
  return { conservative, optimistic };
}

function takehomeMonthly(base: number) {
  let tax = 0;
  if (base > 1_500_000) tax += (base - 1_500_000) * 0.3 + 1_000_000 * 0.2 + 250_000 * 0.05;
  else if (base > 500_000) tax += (base - 500_000) * 0.2 + 250_000 * 0.05;
  else if (base > 250_000) tax += (base - 250_000) * 0.05;
  return Math.round((base - tax) / 12);
}

function locationIndex(location: string) {
  const lower = location.toLowerCase();
  if (lower.includes("mumbai")) return 0.9;
  if (lower.includes("delhi")) return 0.92;
  if (lower.includes("bangalore") || lower.includes("bengaluru")) return 0.95;
  if (lower.includes("singapore")) return 0.75;
  if (lower.includes("us") || lower.includes("san francisco") || lower.includes("new york")) return 0.6;
  if (lower.includes("remote")) return 1;
  return 0.95;
}

function baseOfferMetrics(offer: OfferInput) {
  const equity = equityValues(offer);
  const vestingYears = Math.max(1, offer.equity?.vestingYears ?? 4);
  const annualBonus = ((offer.bonus ?? 0) / 100) * offer.base;
  const totalCompYear1 = Math.round(offer.base + annualBonus + equity.conservative / vestingYears);
  const totalCompYear4 = Math.round(offer.base * 4 + annualBonus * 4 + equity.optimistic);
  const growthScore = Math.min(100, stageGrowth[offer.companyStage] + (equity.optimistic > 0 ? 8 : 0));
  const stabilityScore = stageStability[offer.companyStage];
  const workLifeScore = offer.workMode === "remote" ? 85 : offer.workMode === "hybrid" ? 70 : 55;

  return {
    ...offer,
    totalCompYear1,
    totalCompYear4,
    equityValueConservative: Math.round(equity.conservative),
    equityValueOptimistic: Math.round(equity.optimistic),
    takehomeMonthly: takehomeMonthly(offer.base),
    locationAdjustedValue: Math.round(totalCompYear1 * locationIndex(offer.location)),
    growthScore,
    stabilityScore,
    workLifeScore,
  };
}

function processOffers(offers: OfferInput[], priorities: OfferPriorities): ProcessedOffer[] {
  const metrics = offers.map(baseOfferMetrics);
  const maxComp = Math.max(...metrics.map((offer) => offer.locationAdjustedValue), 1);
  const totalWeight = priorities.compensation + priorities.growth + priorities.stability + priorities.workLife;

  return metrics.map(({ workLifeScore, ...offer }) => {
    const compScore = Math.min(100, Math.round((offer.locationAdjustedValue / maxComp) * 100));
    const overallScore = Math.round((
      compScore * priorities.compensation +
      offer.growthScore * priorities.growth +
      offer.stabilityScore * priorities.stability +
      workLifeScore * priorities.workLife
    ) / totalWeight);

    return { ...offer, overallScore };
  });
}

function sanitizeAdvisory(
  advisory: Partial<Omit<OfferAnalysis, "offers">>,
  processed: ProcessedOffer[]
): Omit<OfferAnalysis, "offers"> {
  const top = [...processed].sort((a, b) => b.overallScore - a.overallScore)[0]!;
  const validWinner = processed.some((offer) => offer.id === advisory.winner) ? advisory.winner! : top.id;
  const winnerOffer = processed.find((offer) => offer.id === validWinner) ?? top;

  return {
    winner: validWinner,
    winnerReasoning: typeof advisory.winnerReasoning === "string" && advisory.winnerReasoning.trim()
      ? advisory.winnerReasoning.trim()
      : `${winnerOffer.company} has the strongest weighted score for your selected priorities.`,
    tradeoffs: Array.isArray(advisory.tradeoffs) && advisory.tradeoffs.length > 0
      ? advisory.tradeoffs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : processed.map((offer) => `${offer.company}: ${offer.overallScore}/100 overall score with ${offer.totalCompYear1.toLocaleString("en-IN")} year-one compensation.`),
    negotiationLeverage: typeof advisory.negotiationLeverage === "string" && advisory.negotiationLeverage.trim()
      ? advisory.negotiationLeverage.trim()
      : "Use the strongest competing package respectfully, without inventing numbers or implying offers that do not exist.",
    redFlags: Array.isArray(advisory.redFlags)
      ? advisory.redFlags.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const processed = processOffers(parsed.data.offers, parsed.data.priorities);
  let advisory = sanitizeAdvisory({}, processed);

  try {
    const { data } = await callClaudeJson<Omit<OfferAnalysis, "offers">>({
      system: "You are an expert compensation advisor. Analyze these job offers and provide a clear recommendation. Return ONLY valid JSON.",
      user: `Offers: ${JSON.stringify(processed)}. User priorities (0-10): ${JSON.stringify(parsed.data.priorities)}. Provide JSON: { winner: offerId, winnerReasoning: string, tradeoffs: string[], negotiationLeverage: string, redFlags: string[] }`,
      maxTokens: 1800,
    });
    advisory = sanitizeAdvisory(data, processed);
  } catch {
    // Deterministic scoring is still returned.
  }

  const analysis: OfferAnalysis = { offers: processed, ...advisory };
  await prisma.offerComparison.create({
    data: {
      userId,
      title: `Offer comparison: ${processed.map((offer) => offer.company).join(" vs ")}`.slice(0, 120),
      offers: parsed.data.offers as unknown as Prisma.InputJsonValue[],
      analysis: analysis as unknown as Prisma.InputJsonValue,
      winner: analysis.winner,
    },
  });

  return NextResponse.json(analysis);
}
