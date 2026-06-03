/**
 * lib/agent/goals.ts
 *
 * Goal Decomposition Engine.
 * Parses natural language goals, analyzes timeline constraints,
 * and breaks them down into hierarchical milestones and actionable tasks.
 */

import { z } from "zod";
import { geminiJSON } from "@/lib/ai/core";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import type { GoalDecomposition, GoalMilestone, GoalTask } from "./types";

const DecompositionResponseSchema = z.object({
  targetRole: z.string(),
  targetCompany: z.string().optional(),
  timelineWeeks: z.number(),
  milestones: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      timeframeWeeks: z.number(),
      dependencies: z.array(z.string()),
    })
  ),
  tasks: z.array(
    z.object({
      id: z.string(),
      milestoneId: z.string(),
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
      metadata: z.record(z.string(), z.any()).default({}),
    })
  ),
});

export class GoalDecompositionEngine {
  /**
   * Decomposes a user goal string into structured milestones and tasks.
   */
  static async decompose(
    userId: string,
    goalInput: string,
    profileContext: {
      skills: string[];
      experience: any[];
      education: string[];
    }
  ): Promise<GoalDecomposition> {
    logger.info({ userId, goalInput }, "[GoalDecompositionEngine] Decomposing goal...");

    const systemPrompt = `
You are the CareerOS Goal Decomposition Engine. Your task is to take a user's career goal and profile, and break it down into a highly detailed, professional, step-by-step career milestones and tasks plan.

Ensure tasks are concrete, specific to the target company (if specified), and tailored to fill gaps between their current skills and target role.

Output JSON matching this schema:
{
  "targetRole": "string (e.g. Backend Engineer)",
  "targetCompany": "string or null (e.g. Google)",
  "timelineWeeks": number (total weeks based on user input, default to 24 if not specified),
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "Milestone description",
      "timeframeWeeks": 4, // duration in weeks
      "dependencies": [] // dependent milestone IDs
    }
  ],
  "tasks": [
    {
      "id": "t1",
      "milestoneId": "m1",
      "title": "Task title",
      "description": "Detailed task instructions",
      "type": "skill_acquisition | project_build | certification | networking | application | interview_prep",
      "metadata": {} // type-specific helper data
    }
  ]
}
`;

    const userPrompt = `
User Goal: "${goalInput}"

Current User Profile:
- Skills: ${profileContext.skills.join(", ")}
- Education: ${profileContext.education.join(" | ")}
- Work Experience Summary:
${profileContext.experience
  .map((e) => `  * ${e.title} at ${e.company}: ${e.description.slice(0, 150)}`)
  .join("\n")}
`;

    const fallback: z.infer<typeof DecompositionResponseSchema> = {
      targetRole: "Software Engineer",
      targetCompany: undefined,
      timelineWeeks: 24,
      milestones: [
        {
          id: "m1",
          title: "Skill Gap Analysis & Foundational Prep",
          description: "Establish baseline proficiency in core target requirements.",
          timeframeWeeks: 4,
          dependencies: [],
        },
        {
          id: "m2",
          title: "Core DSA & System Architecture",
          description: "Master algorithms, data structures, and distributed design principles.",
          timeframeWeeks: 8,
          dependencies: ["m1"],
        },
        {
          id: "m3",
          title: "Targeted Applications & Interview Simulation",
          description: "Initiate applications and undergo intensive mock practice.",
          timeframeWeeks: 12,
          dependencies: ["m2"],
        },
      ],
      tasks: [
        {
          id: "t1",
          milestoneId: "m1",
          title: "Conduct Detailed System Design Assessment",
          description: "Read system design primers and test knowledge on distributed systems.",
          type: "interview_prep",
          metadata: {},
        },
        {
          id: "t2",
          milestoneId: "m1",
          title: "Learn Rust & Modern Backend Paradigms",
          description: "Complete key rustlang modules and build a basic web server.",
          type: "skill_acquisition",
          metadata: { skill: "Rust" },
        },
      ],
    };

    try {
      const response = await geminiJSON({
        system: systemPrompt,
        user: userPrompt,
        fallback,
        schema: DecompositionResponseSchema,
        temperature: 0.2,
      });

      // Save goals into user's CareerProfile
      const existingProfile = await prisma.careerProfile.findUnique({
        where: { userId },
      });

      const updatedGoals = {
        ...(existingProfile?.goals as Record<string, any> || {}),
        primary: {
          rawInput: goalInput,
          targetRole: response.targetRole,
          targetCompany: response.targetCompany || null,
          timelineWeeks: response.timelineWeeks,
          decomposedAt: new Date().toISOString(),
        },
      };

      await prisma.careerProfile.upsert({
        where: { userId },
        create: {
          userId,
          goals: updatedGoals,
          preferences: {},
          constraints: {},
        },
        update: {
          goals: updatedGoals,
        },
      });

      return {
        goalId: crypto.randomUUID(),
        targetRole: response.targetRole,
        ...(response.targetCompany ? { targetCompany: response.targetCompany } : {}),
        timelineWeeks: response.timelineWeeks,
        milestones: response.milestones.map((m) => ({
          ...m,
          status: "pending",
          progressPct: 0,
        })) as GoalMilestone[],
        tasks: response.tasks.map((t) => ({
          ...t,
          status: "todo",
        })) as GoalTask[],
      };
    } catch (err) {
      logger.error({ err, userId }, "[GoalDecompositionEngine] Decomposition failed");
      return {
        goalId: crypto.randomUUID(),
        targetRole: fallback.targetRole,
        ...(fallback.targetCompany ? { targetCompany: fallback.targetCompany } : {}),
        timelineWeeks: fallback.timelineWeeks,
        milestones: fallback.milestones.map((m) => ({
          ...m,
          status: "pending",
          progressPct: 0,
        })) as GoalMilestone[],
        tasks: fallback.tasks.map((t) => ({
          ...t,
          status: "todo",
        })) as GoalTask[],
      };
    }
  }
}
