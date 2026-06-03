/**
 * lib/agent/roadmap.ts
 *
 * Career Roadmap Generator.
 * Creates phased weekly roadmaps with objectives, projects, and certifications.
 * Saves structures into `CareerTwin.activePlan` and writes snapshots to `RoadmapSnapshot`.
 */

import { geminiJSON } from "@/lib/ai/core";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { CareerRoadmap, CareerRoadmapPhase } from "./types";
import { AgentMemory } from "./memory";

const RoadmapResponseSchema = z.object({
  phases: z.array(
    z.object({
      phaseNumber: z.number(),
      title: z.string(),
      focus: z.string(),
      weeks: z.array(z.number()),
      milestones: z.array(z.string()),
      weeklyPlans: z.array(
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
    })
  ),
});

export class CareerRoadmapGenerator {
  /**
   * Generates a CareerRoadmap based on user goal, profile, and gaps.
   */
  static async generate(
    userId: string,
    goalId: string,
    targetRole: string,
    targetCompany: string | undefined,
    timelineWeeks: number,
    missingSkills: string[],
    suggestedCertifications: any[],
    recommendedProjects: any[]
  ): Promise<CareerRoadmap> {
    logger.info({ userId, targetRole }, "[CareerRoadmapGenerator] Generating roadmap...");

    const systemPrompt = `
You are the CareerOS Career Roadmap Generator.
Create a detailed, weekly phased action plan to transition the user into their target role.
Ensure that:
1. Suggested projects are scheduled during the middle/later phases of the timeline.
2. Certifications and missing skills study are scheduled in the early phases.
3. Networking and application preparation occur in parallel in the final third of the timeline.

Match the output JSON schema:
{
  "phases": [
    {
      "phaseNumber": 1,
      "title": "Phase title",
      "focus": "High level focus of the phase",
      "weeks": [1, 2, 3, 4],
      "milestones": ["m1", "m2"],
      "weeklyPlans": [
        {
          "weekNumber": 1,
          "focus": "Weekly sub-focus",
          "objectives": ["Objective 1"],
          "actionItems": [
            {
              "title": "Action item title",
              "description": "Details",
              "type": "skill_acquisition | project_build | certification | networking | application | interview_prep",
              "estimatedHours": 4
            }
          ]
        }
      ]
    }
  ]
}
`;

    const userPrompt = `
Target Role: ${targetRole}
Target Company: ${targetCompany || "Any Major Tech Company"}
Timeline: ${timelineWeeks} weeks
Missing Skills: ${missingSkills.join(", ")}
Suggested Certifications: ${JSON.stringify(suggestedCertifications)}
Recommended Projects: ${JSON.stringify(recommendedProjects)}
`;

    const fallbackPhases: CareerRoadmapPhase[] = [
      {
        phaseNumber: 1,
        title: "Foundation & Skills Acquisition",
        focus: "Bridge critical skill gaps and begin foundational preparation",
        weeks: [1, 2, 3, 4],
        milestones: ["m1"],
        weeklyPlans: [
          {
            weekNumber: 1,
            focus: "Skill Gap Study",
            objectives: ["Start learning core missing topics"],
            actionItems: [
              {
                id: crypto.randomUUID(),
                title: "Study missing concepts",
                description: `Read technical guides on ${missingSkills.slice(0, 2).join(" & ") || "Backend System Engineering"}`,
                type: "skill_acquisition",
                estimatedHours: 10,
                completed: false,
              },
            ],
          },
        ],
      },
    ];

    try {
      const result = await geminiJSON({
        system: systemPrompt,
        user: userPrompt,
        fallback: { phases: [] },
        schema: RoadmapResponseSchema,
      });

      const phases: CareerRoadmapPhase[] = result.phases.map((p) => ({
        phaseNumber: p.phaseNumber,
        title: p.title,
        focus: p.focus,
        weeks: p.weeks,
        milestones: p.milestones,
        weeklyPlans: p.weeklyPlans.map((w) => ({
          weekNumber: w.weekNumber,
          focus: w.focus,
          objectives: w.objectives,
          actionItems: w.actionItems.map((a) => ({
            id: crypto.randomUUID(),
            title: a.title,
            description: a.description,
            type: a.type,
            estimatedHours: a.estimatedHours,
            completed: false,
          })),
        })),
      }));

      const roadmap: CareerRoadmap = {
        id: crypto.randomUUID(),
        userId,
        goalId,
        targetRole,
        ...(targetCompany ? { targetCompany } : {}),
        timelineWeeks,
        phases,
        skillsToAcquire: missingSkills.map((s) => ({
          skill: s,
          priority: "high",
          currentLevel: 0.2,
          targetLevel: 0.8,
          resources: [`Study materials for ${s}`],
        })),
        certificationsSuggested: suggestedCertifications,
        projectsRecommended: recommendedProjects,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // ─── Save in CareerTwin ───
      const twin = await AgentMemory.getOrCreateTwin(userId);
      await prisma.careerTwin.update({
        where: { id: twin.id },
        data: {
          activePlan: roadmap as any,
          status: "active",
        },
      });

      // ─── Save in RoadmapSnapshot ───
      // Format the lists for sevenDayPlan, fourteenDayPlan, etc.
      const getPlanForDays = (days: number) => {
        const weeks = Math.ceil(days / 7);
        const plans: string[] = [];
        for (const phase of phases) {
          for (const week of phase.weeklyPlans) {
            if (week.weekNumber <= weeks) {
              plans.push(...week.objectives);
            }
          }
        }
        return plans.slice(0, 10);
      };

      await prisma.roadmapSnapshot.create({
        data: {
          userId,
          roleTitle: targetRole,
          companyName: targetCompany || null,
          sourceWeaknesses: missingSkills,
          sevenDayPlan: getPlanForDays(7),
          fourteenDayPlan: getPlanForDays(14),
          thirtyDayPlan: getPlanForDays(30),
          ninetyDayPlan: getPlanForDays(90),
        },
      });

      // ─── Save in PreparationRoadmap ───
      await prisma.preparationRoadmap.create({
        data: {
          userId,
          roleTitle: targetRole,
          companyName: targetCompany || null,
          sevenDaysPlan: getPlanForDays(7),
          fourteenDaysPlan: getPlanForDays(14),
          thirtyDaysPlan: getPlanForDays(30),
        },
      });

      return roadmap;
    } catch (err) {
      logger.error({ err, userId }, "[CareerRoadmapGenerator] Generation failed, using default fallback");

      const defaultRoadmap: CareerRoadmap = {
        id: crypto.randomUUID(),
        userId,
        goalId,
        targetRole,
        ...(targetCompany ? { targetCompany } : {}),
        timelineWeeks,
        phases: fallbackPhases,
        skillsToAcquire: missingSkills.map((s) => ({
          skill: s,
          priority: "medium",
          currentLevel: 0.2,
          targetLevel: 0.8,
          resources: [],
        })),
        certificationsSuggested: suggestedCertifications,
        projectsRecommended: recommendedProjects,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return defaultRoadmap;
    }
  }
}
