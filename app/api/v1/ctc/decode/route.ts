import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import { checkDailyRateLimit } from "@/lib/security/ratelimit";
import { decodeCTC, type OtherAllowance, type TaxRegime } from "@/lib/services/ctc-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowanceSchema = z.object({
  name: z.string().min(1).max(80),
  amount: z.number().nonnegative(),
});

const manualBreakdownSchema = z.object({
  quotedCtc: z.number().nonnegative().optional(),
  fixedComponent: z.number().nonnegative(),
  variableComponent: z.number().nonnegative().optional(),
  variablePct: z.number().nonnegative().max(100).optional(),
  basicSalary: z.number().nonnegative(),
  hra: z.number().nonnegative().optional(),
  specialAllowance: z.number().nonnegative().optional(),
  pfEmployer: z.number().nonnegative().optional(),
  gratuityAnnual: z.number().nonnegative().optional(),
  bonus: z.number().nonnegative().optional(),
  esop: z.number().nonnegative().optional(),
  otherAllowances: z.array(allowanceSchema).optional(),
});

const requestSchema = z.object({
  rawText: z.string().max(20000).optional(),
  company: z.string().max(160).optional(),
  manualBreakdown: manualBreakdownSchema.optional(),
  taxRegime: z.enum(["new", "old"]).default("new"),
}).refine((value) => value.rawText?.trim() || value.manualBreakdown, {
  message: "Either rawText or manualBreakdown is required.",
});

type ExtractedOffer = z.infer<typeof manualBreakdownSchema> & {
  company?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;

  const normalized = value.replace(/,/g, "").trim().toLowerCase();
  const numeric = Number(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;

  if (/\bcr(?:ore)?s?\b/.test(normalized)) return numeric * 10000000;
  if (/\bl(?:akh|ac)?s?\b/.test(normalized)) return numeric * 100000;
  if (/\bk\b/.test(normalized)) return numeric * 1000;
  return numeric;
}

function findAmount(text: string, patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return toNumber(match[1]);
  }

  return 0;
}

function fallbackExtract(rawText: string): ExtractedOffer {
  const text = rawText.replace(/\s+/g, " ");
  const fixedComponent = findAmount(text, [
    /fixed\s+(?:component|pay|salary|compensation)[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i,
    /base\s+(?:salary|pay)[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i,
  ]);
  const quotedCtc = findAmount(text, [
    /(?:total\s+)?ctc[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i,
    /cost\s+to\s+company[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i,
  ]);
  const variableComponent = findAmount(text, [
    /variable\s+(?:pay|component|bonus)[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i,
    /performance\s+bonus[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i,
  ]);
  const basicSalary = findAmount(text, [/basic\s+(?:salary|pay)[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i]);
  const hra = findAmount(text, [/hra[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i]);
  const specialAllowance = findAmount(text, [/special\s+allowance[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i]);
  const pfEmployer = findAmount(text, [/employer'?s?\s+pf[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i]);
  const gratuityAnnual = findAmount(text, [/gratuity[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i]);
  const esop = findAmount(text, [/(?:esop|rsu|stock)[^0-9]*(?:inr|rs\.?|₹)?\s*([0-9,.]+\s*(?:lakh|lakhs|lac|lacs|cr|crore|k)?)/i]);
  const usableFixed = fixedComponent || Math.max(0, quotedCtc - variableComponent - pfEmployer - gratuityAnnual);
  const inferredBasic = basicSalary || Math.round(usableFixed * 0.5);

  return {
    quotedCtc,
    fixedComponent: usableFixed,
    variableComponent,
    variablePct: usableFixed > 0 && variableComponent > 0 ? Math.round((variableComponent / usableFixed) * 100) : 0,
    basicSalary: inferredBasic,
    hra: hra || Math.round(inferredBasic * 0.5),
    specialAllowance,
    pfEmployer,
    gratuityAnnual,
    bonus: variableComponent,
    esop,
    otherAllowances: [],
  };
}

function sanitizeExtracted(value: Partial<ExtractedOffer> | null | undefined): ExtractedOffer {
  const fixedComponent = toNumber(value?.fixedComponent);
  const quotedCtc = toNumber(value?.quotedCtc);
  const variableComponent = toNumber(value?.variableComponent);
  const basicSalary = toNumber(value?.basicSalary) || Math.round(fixedComponent * 0.5);
  const allowances = Array.isArray(value?.otherAllowances)
    ? value.otherAllowances.map((item) => ({ name: item.name, amount: toNumber(item.amount) })) as OtherAllowance[]
    : [];

  const extracted: ExtractedOffer = {
    quotedCtc,
    fixedComponent,
    variableComponent,
    variablePct: toNumber(value?.variablePct),
    basicSalary,
    hra: toNumber(value?.hra),
    specialAllowance: toNumber(value?.specialAllowance),
    pfEmployer: toNumber(value?.pfEmployer),
    gratuityAnnual: toNumber(value?.gratuityAnnual),
    bonus: toNumber(value?.bonus),
    esop: toNumber(value?.esop),
    otherAllowances: allowances,
  };

  if (typeof value?.company === "string" && value.company.trim()) {
    extracted.company = value.company.trim();
  }

  return extracted;
}

async function extractFromRawText(rawText: string): Promise<ExtractedOffer> {
  try {
    const { data } = await callClaudeJson<ExtractedOffer>({
      system: "Extract salary components from this Indian offer letter. Return ONLY valid JSON.",
      user: `Extract from: "${rawText}". Return: { company, fixedComponent, quotedCtc, variableComponent, variablePct, basicSalary, hra, specialAllowance, pfEmployer, gratuityAnnual, bonus, esop, otherAllowances: [{name, amount}] }. All values in INR per annum. If a component is not mentioned, set it to 0.`,
      maxTokens: 1200,
    });

    return sanitizeExtracted(data);
  } catch {
    return fallbackExtract(rawText);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  // Rate limit checks
  if (userId) {
    const limited = await checkDailyRateLimit(userId, 20, "ctc_decode");
    if (!limited.allowed) return NextResponse.json({ error: "Daily CTC decode limit reached." }, { status: 429 });
  } else {
    // Guest mode rate limit based on IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const limited = await checkDailyRateLimit(ip, 5, "ctc_decode_guest");
    if (!limited.allowed) return NextResponse.json({ error: "Daily CTC guest limit reached. Please sign up to unlock unlimited scans." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload.", details: parsed.error.flatten() }, { status: 400 });

  const input = parsed.data;
  const extracted = input.rawText?.trim()
    ? await extractFromRawText(input.rawText.trim())
    : sanitizeExtracted(input.manualBreakdown);

  if (!extracted.fixedComponent && !extracted.quotedCtc) {
    return NextResponse.json({ error: "Could not identify salary components from the offer." }, { status: 400 });
  }

  const fixedComponent = extracted.fixedComponent || extracted.quotedCtc || 0;
  const decoded = decodeCTC({
    quotedCtc: extracted.quotedCtc ?? 0,
    fixedComponent,
    variableComponent: extracted.variableComponent ?? 0,
    variablePct: extracted.variablePct ?? 0,
    basicSalary: extracted.basicSalary,
    hra: extracted.hra ?? 0,
    specialAllowance: extracted.specialAllowance ?? 0,
    pfEmployer: extracted.pfEmployer ?? 0,
    gratuityAnnual: extracted.gratuityAnnual ?? 0,
    bonus: extracted.bonus ?? 0,
    esop: extracted.esop ?? 0,
    otherAllowances: extracted.otherAllowances ?? [],
    taxRegime: input.taxRegime as TaxRegime,
  });

  if (!userId) {
    // Guest mode: Return decoded payload immediately without database insert
    return NextResponse.json({ id: "guest-decode", guestMode: true, ...decoded });
  }

  const record = await prisma.ctcDecoding.create({
    data: {
      userId,
      rawInput: input.rawText ?? null,
      company: input.company ?? extracted.company ?? null,
      quotedCtc: decoded.quotedCtc,
      fixedComponent: decoded.fixedComponent,
      variableComponent: decoded.variableComponent,
      variablePct: decoded.variablePct,
      basicSalary: decoded.basicSalary,
      hra: decoded.hra,
      specialAllowance: decoded.specialAllowance,
      pfEmployee: decoded.pfEmployee,
      pfEmployer: decoded.pfEmployer,
      gratuityAnnual: decoded.gratuityAnnual,
      bonus: decoded.bonus,
      esop: decoded.esop,
      otherAllowances: decoded.otherAllowances as unknown as Prisma.InputJsonValue,
      grossMonthly: decoded.grossMonthly,
      netMonthly: decoded.netMonthly,
      taxAnnual: decoded.taxAnnual,
      taxRegime: decoded.taxRegime,
      effectiveCtc: decoded.effectiveCtc,
    },
  });

  return NextResponse.json({ id: record.id, ...decoded });
}
