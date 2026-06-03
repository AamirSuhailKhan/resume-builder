/**
 * GET  /api/v1/career-graph          → full graph (nodes + edges)
 * POST /api/v1/career-graph/rebuild  → (body) full rebuild trigger
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GraphService, GraphBuilderService, GraphCacheService } from "@/lib/career-graph";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
// Removed force-dynamic: GraphCacheService uses Redis so each request
// is already served from cache after the first build — no need to skip ISR.

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const graph = await GraphCacheService.rememberGraph(userId, () =>
      GraphService.getGraph(userId)
    );

    return NextResponse.json({ graph }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[GET /api/v1/career-graph] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Trigger full rebuild
    await GraphBuilderService.fullRebuild(userId);
    await GraphCacheService.invalidateAll(userId);

    return NextResponse.json({ success: true, message: "Graph rebuilt" }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[POST /api/v1/career-graph] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
