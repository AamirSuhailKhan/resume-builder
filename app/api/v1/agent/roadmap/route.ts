/**
 * app/api/v1/agent/roadmap/route.ts
 *
 * Retrieves the user's active roadmap from their CareerTwin.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AgentMemory } from "@/lib/agent";
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

    const twin = await AgentMemory.getOrCreateTwin(userId);
    if (!twin.activePlan || typeof twin.activePlan !== "object" || Object.keys(twin.activePlan).length === 0) {
      return NextResponse.json({ activeRoadmap: null }, { status: 200 });
    }

    return NextResponse.json({ activeRoadmap: twin.activePlan }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/roadmap] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
