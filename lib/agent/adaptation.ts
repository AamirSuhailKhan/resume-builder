/**
 * lib/agent/adaptation.ts
 *
 * Weekly Adaptation Engine.
 * Re-evaluates progress at the end of each week, adapts future plans
 * based on achievements or missed goals, and issues weekly adaptation reports.
 */

import { geminiJSON } from "@/lib/ai/core";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { CareerRoadmap, WeeklyAdaptationReport } from "./types";
import { AgentMemory } from "./memory";

const AdaptationResponseSchema = z.object({
  reasonsForChange: z.array(z.string()),
  adjustments: z.array(
    z.object({
      type: z.enum(["add_task", "remove_task", "reschedule_task", "adjust_skill_priority"]),
      description: z.string(),
      details: z.record(z.string(), z.any()).default({}),
    })
  ),
  newWeeklyPlans: z.array(
    z.object({
      weekNumber: z.number(),
      focus: z.string(),
      objectives: z.array(z.string()),
      actionItems: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          type: z.enum([
            "skill_acquisition",
            "project_build",
            "certification",
            "networking",
            "application",
            "interview_prep",
          ]),
          estimatedHours: z.number(),
        })
      ),
    })
  ),
});

export class WeeklyAdaptationEngine {
  /**
   * Adapts the user's roadmap based on their weekly activity.
   */
  static async adaptRoadmap(
    userId: string,
    currentWeekNumber: number
  ): Promise<WeeklyAdaptationReport | null> {
    logger.info({ userId, currentWeekNumber }, "[WeeklyAdaptationEngine] Running weekly adaptation...");

    const twin = await AgentMemory.getOrCreateTwin(userId);
    if (!twin.activePlan || typeof twin.activePlan !== "object") {
      logger.warn({ userId }, "[WeeklyAdaptationEngine] No active plan found in twin");
      return null;
    }

    const roadmap = twin.activePlan as unknown as CareerRoadmap;

    // Gather active metrics from current week
    const currentWeekPlan = roadmap.phases
      .flatMap((p) => p.weeklyPlans)
      .find((w) => w.weekNumber === currentWeekNumber);

    if (!currentWeekPlan) {
      logger.warn({ currentWeekNumber }, "[WeeklyAdaptationEngine] Current week plan not found");
      return null;
    }

    const completedTasks = currentWeekPlan.actionItems.filter((t) => t.completed);
    const missedTasks = currentWeekPlan.actionItems.filter((t) => !t.completed);

    const completedObjectives = completedTasks.map((t) => t.title);
    const missedObjectives = missedTasks.map((t) => t.title);

    // Fetch user context updates from database
    const [recentApplicationsCount, recentInterviewsCount] = await Promise.all([
      prisma.application.count({
        where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.interviewMockSession.count({
        where: { userId, status: "completed", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const userProfile = await AgentMemory.retrieveUserContext(userId);

    const systemPrompt = `
You are the CareerOS Weekly Adaptation Engine.
Analyze the user's target goals, what objectives they completed or missed this week, and recent activity (applications, interviews).
Decide whether to adapt future weeks of the roadmap:
- If they missed critical tasks, reschedule them to the next week, possibly adjusting future week workload.
- If they got rejections or did poorly in interviews, insert mock prep tasks.
- If they excelled and completed everything, accelerate their timelines or add bonus skill acquisitions.

Output JSON matching this schema:
{
  "reasonsForChange": ["string explaining why adaptation is needed"],
  "adjustments": [
    {
      "type": "add_task | remove_task | reschedule_task | adjust_skill_priority",
      "description": "Short explanation of adjustment",
      "details": {}
    }
  ],
  "newWeeklyPlans": [
    {
      "weekNumber": number (next week onwards),
      "focus": "Weekly focus",
      "objectives": ["Objective 1"],
      "actionItems": [
        {
          "title": "Action title",
          "description": "Details",
          "type": "skill_acquisition | project_build | certification | networking | application | interview_prep",
          "estimatedHours": number
        }
      ]
    }
  ]
}
`;

    const userPrompt = `
Current Week: ${currentWeekNumber}
Goal Target Role: ${roadmap.targetRole}
Goal Target Company: ${roadmap.targetCompany || "Any Major Tech Company"}

This Week's Completed Tasks:
${completedObjectives.map((o) => `  * ${o}`).join("\n") || "  (None)"}

This Week's Missed Tasks:
${missedObjectives.map((o) => `  * ${o}`).join("\n") || "  (None)"}

Recent Platform Activity:
- Job applications submitted in last 7 days: ${recentApplicationsCount}
- Mock interviews completed in last 7 days: ${recentInterviewsCount}
- Current Skills list: ${userProfile.skills.join(", ")}
`;

    try {
      const response = await geminiJSON({
        system: systemPrompt,
        user: userPrompt,
        fallback: { reasonsForChange: [], adjustments: [], newWeeklyPlans: [] },
        schema: AdaptationResponseSchema,
      });

      // Apply the new weekly plans to the roadmap
      for (const phase of roadmap.phases) {
        for (const updatedWeek of response.newWeeklyPlans) {
          const originalWeek = phase.weeklyPlans.find((w) => w.weekNumber === updatedWeek.weekNumber);
          if (originalWeek) {
            originalWeek.focus = updatedWeek.focus;
            originalWeek.objectives = updatedWeek.objectives;
            originalWeek.actionItems = updatedWeek.actionItems.map((a) => ({
              id: crypto.randomUUID(),
              title: a.title,
              description: a.description,
              type: a.type,
              estimatedHours: a.estimatedHours,
              completed: false,
            }));
          }
        }
      }

      roadmap.updatedAt = new Date().toISOString();

      // Save updated active plan in CareerTwin
      await prisma.careerTwin.update({
        where: { id: twin.id },
        data: {
          activePlan: roadmap as any,
        },
      });

      // Dispatch a notification notifying the user of the adaptation
      if (response.reasonsForChange.length > 0) {
        await prisma.actionFeedItem.create({
          data: {
            userId,
            priority: 8,
            title: "Roadmap Adapted",
            description: `We've optimized your schedule for Week ${currentWeekNumber + 1}: ${response.reasonsForChange[0]}`,
            actionUrl: "/career-graph",
            category: "ROADMAP_ADAPTATION",
          },
        });
      }

      const report: WeeklyAdaptationReport = {
        userId,
        roadmapId: roadmap.id,
        originalWeekNumber: currentWeekNumber,
        adaptationWeekNumber: currentWeekNumber + 1,
        completedObjectives,
        missedObjectives,
        gainedSkills: [], // derived from completed task types if any
        reasonsForChange: response.reasonsForChange,
        adjustmentsMade: response.adjustments.map((a) => ({
          type: a.type,
          description: a.description,
          details: a.details,
        })),
        newWeeklyPlans: roadmap.phases.flatMap((p) => p.weeklyPlans).filter((w) => w.weekNumber > currentWeekNumber),
        updatedAt: new Date().toISOString(),
      };

      // Log Event
      await prisma.twinEvent.create({
        data: {
          twinId: twin.id,
          userId,
          type: "evolved",
          source: "weekly_adaptation",
          summary: `Roadmap adapted at Week ${currentWeekNumber}. Adjusted ${response.adjustments.length} segments.`,
          payload: report as any,
        },
      });

      return report;
    } catch (err) {
      logger.error({ err, userId }, "[WeeklyAdaptationEngine] Adaptation process crashed");
      return null;
    }
  }
}
