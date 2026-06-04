/**
 * app/api/v1/agent/progress/route.ts
 *
 * Retrieves progress summaries and streaks computed by the Agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ProgressTrackingEngine } from "@/lib/agent";
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

    const progress = await ProgressTrackingEngine.getUserProgressSummary(userId);

    return NextResponse.json({ success: true, progress }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/progress] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
