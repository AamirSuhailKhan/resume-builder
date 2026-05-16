import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AnalyticsService } from "@/lib/services/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function inferRoleLevel(headline?: string | null) {
  const text = (headline ?? "").toLowerCase();
  if (text.includes("executive") || text.includes("vp")) return "executive";
  if (text.includes("lead") || text.includes("principal") || text.includes("staff")) return "lead";
  if (text.includes("senior")) return "senior";
  if (text.includes("junior") || text.includes("entry")) return "entry";
  return "mid";
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.applicationAnalytics.findUnique({ where: { userId } });
  const analytics = !existing || Date.now() - existing.lastComputedAt.getTime() > 60 * 60 * 1000
    ? await AnalyticsService.computeUserAnalytics(userId)
    : existing;

  const profile = await prisma.careerProfile.findUnique({ where: { userId } });
  const goals = asRecord(profile?.goals);
  const preferences = asRecord(profile?.preferences);
  const roleLevel = typeof goals.roleLevel === "string" ? goals.roleLevel : inferRoleLevel(profile?.headline);
  const industry = typeof preferences.industry === "string" ? preferences.industry : "tech";
  const location = typeof preferences.location === "string" ? preferences.location : "india";

  const benchmark = await AnalyticsService.getBenchmark(roleLevel, industry, location) ?? {
    id: "fallback",
    roleLevel,
    industry,
    location,
    responseRate: 0.22,
    interviewRate: 0.1,
    offerRate: 0.04,
    avgDaysToOffer: 42,
    sampleSize: 1000,
    updatedAt: new Date(),
  };

  const responseRateDelta = analytics.responseRate - benchmark.responseRate;
  const interviewRateDelta = analytics.interviewRate - benchmark.interviewRate;
  const verdict = responseRateDelta > 0.03 ? "above" : responseRateDelta < -0.03 ? "below" : "at";

  return NextResponse.json({
    analytics,
    benchmark,
    comparison: { responseRateDelta, interviewRateDelta, verdict },
  });
}
