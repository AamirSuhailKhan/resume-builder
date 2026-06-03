/**
 * app/api/v1/agent/task/complete/route.ts
 *
 * Marks a specific action item inside the active roadmap as completed.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { ProgressTrackingEngine } from "@/lib/agent";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CompleteSchema = z.object({
  roadmapId: z.string().uuid(),
  taskId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const parsed = CompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { roadmapId, taskId } = parsed.data;
    const updatedRoadmap = await ProgressTrackingEngine.completeTask(userId, roadmapId, taskId);

    if (!updatedRoadmap) {
      return NextResponse.json({ error: "Roadmap or task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, roadmap: updatedRoadmap }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/task/complete] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
