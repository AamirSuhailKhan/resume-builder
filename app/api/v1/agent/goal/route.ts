/**
 * app/api/v1/agent/goal/route.ts
 *
 * Activates an autonomous career agent cycle.
 * Takes a natural language goal, decomposes it, runs toolbox, generates roadmap.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { AutonomousCareerAgent } from "@/lib/agent";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GoalSchema = z.object({
  goalInput: z.string().min(5).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const parsed = GoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid target goal input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { goalInput } = parsed.data;
    logger.info({ userId, goalInput }, "[API /agent/goal] Processing goal activation...");

    const report = await AutonomousCareerAgent.planAndExecute(userId, goalInput);

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/goal] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
