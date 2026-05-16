import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRedisClient } from "@/lib/redis";
import { checkDailyRateLimit } from "@/lib/security/ratelimit";
import { CompanyIntelligenceService } from "@/lib/services/company-intelligence.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkDailyRateLimit(userId, 20, "company_intel");
  if (!limited.allowed) return NextResponse.json({ error: "Daily company intelligence lookup limit reached." }, { status: 429 });

  const { name } = await context.params;
  const companyName = decodeURIComponent(name).trim();
  if (!companyName) return NextResponse.json({ error: "Company name is required." }, { status: 400 });

  const redis = getRedisClient();
  const key = `company_intel:${companyName.toLowerCase()}`;
  const cached = await redis?.get(key).catch(() => null);
  if (cached) return NextResponse.json({ intelligence: cached, fromCache: true });

  const companyDomain = req.nextUrl.searchParams.get("domain") ?? undefined;
  const intelligence = await CompanyIntelligenceService.generateReport(companyName, companyDomain);
  return NextResponse.json({ intelligence, fromCache: false });
}
