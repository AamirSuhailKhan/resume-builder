/**
 * app/api/v1/agent/adapt/route.ts
 *
 * Triggers the weekly adaptation engine to re-align future weekly plans.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { WeeklyAdaptationEngine } from "@/lib/agent";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdaptSchema = z.object({
  currentWeekNumber: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const parsed = AdaptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid week number parameter", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { currentWeekNumber } = parsed.data;
    const report = await WeeklyAdaptationEngine.adaptRoadmap(userId, currentWeekNumber);

    if (!report) {
      return NextResponse.json({ error: "No active plan found or weekly index mismatch" }, { status: 404 });
    }

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/adapt] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
