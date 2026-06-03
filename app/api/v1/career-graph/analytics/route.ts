/**
 * GET /api/v1/career-graph/analytics         → full analytics object
 * GET /api/v1/career-graph/analytics?history=30 → historical snapshots
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GraphAnalyticsService, GraphCacheService } from "@/lib/career-graph";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const historyParam = req.nextUrl.searchParams.get("history");

    if (historyParam) {
      const days = Math.min(parseInt(historyParam) || 30, 365);
      const history = await GraphCacheService.rememberHistory(userId, days, () =>
        GraphAnalyticsService.getHistory(userId, days)
      );
      return NextResponse.json({ history }, { status: 200 });
    }

    const analytics = await GraphCacheService.rememberAnalytics(userId, () =>
      GraphAnalyticsService.compute(userId)
    );

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[GET /api/v1/career-graph/analytics] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
