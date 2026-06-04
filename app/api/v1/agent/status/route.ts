/**
 * app/api/v1/agent/status/route.ts
 *
 * Returns complete agent status: active goal, roadmap summary, progress,
 * and latest analysis snapshot — all in one call for the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AgentMemory, ProgressTrackingEngine } from "@/lib/agent";
import { logger } from "@/lib/logger";
import type { CareerRoadmap } from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [twin, profile, progress, recentMemories, skillGap, readiness] = await Promise.all([
      AgentMemory.getOrCreateTwin(userId),
      prisma.careerProfile.findUnique({ where: { userId } }),
      ProgressTrackingEngine.getUserProgressSummary(userId),
      prisma.twinMemory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.skillGapAnalysis.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.readinessScore.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const roadmap = twin.activePlan && typeof twin.activePlan === "object" && Object.keys(twin.activePlan).length > 0
      ? (twin.activePlan as unknown as CareerRoadmap)
      : null;

    const goals = (profile?.goals as Record<string, any>) ?? {};
    const primaryGoal = goals.primary ?? null;

    // Calculate current active week
    let currentWeek = 1;
    if (roadmap) {
      for (const phase of roadmap.phases) {
        for (const week of phase.weeklyPlans) {
          if (week.actionItems.some((t) => !t.completed)) {
            currentWeek = week.weekNumber;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: {
        hasActiveGoal: !!roadmap,
        primaryGoal,
        roadmap,
        currentWeek,
        progress,
        twinStatus: twin.status,
        twinScores: twin.scores,
        recentMemories: recentMemories.map((m) => ({
          id: m.id,
          type: m.type,
          title: m.title,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
        skillGapSummary: skillGap
          ? {
              targetRole: skillGap.targetRole,
              gapCount: (skillGap.gapSkills as any[]).length,
              estimatedWeeks: skillGap.estimatedWeeks,
              topGaps: (skillGap.gapSkills as any[]).slice(0, 5).map((g: any) => g.name ?? g),
            }
          : null,
        readinessScore: readiness?.overallScore ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "[API /agent/status] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
