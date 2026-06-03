/**
 * GET /api/v1/career-graph/summary → lightweight graph summary (counts + completeness)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GraphService, GraphCacheService } from "@/lib/career-graph";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const summary = await GraphCacheService.rememberSummary(userId, () =>
      GraphService.getSummary(userId)
    );

    return NextResponse.json({ summary }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[GET /api/v1/career-graph/summary] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
