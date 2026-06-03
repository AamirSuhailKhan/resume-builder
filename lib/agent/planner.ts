/**
 * lib/agent/planner.ts
 *
 * Core Agent Planner & Orchestrator.
 * Orchestrates multi-step goal reasoning, tool execution, working memory tracking,
 * and feeds data into the Career Roadmap generator.
 */

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { AgentMemory } from "./memory";
import { GoalDecompositionEngine } from "./goals";
import { AgentToolbox } from "./tools";
import { CareerRoadmapGenerator } from "./roadmap";
import type {
  AgentWorkingMemory,
  AgentPlanStep,
  AgentExecutionReport,
  CareerRoadmap,
} from "./types";

export class AutonomousCareerAgent {
  /**
   * Main entry point to run a complete autonomous reasoning planning cycle.
   */
  static async planAndExecute(
    userId: string,
    goalInput: string
  ): Promise<AgentExecutionReport> {
    logger.info({ userId, goalInput }, "[AutonomousCareerAgent] Planning cycle started...");

    const startTime = new Date().toISOString();
    const workingMemory: AgentWorkingMemory = {
      userId,
      currentSkills: [],
      missingSkills: [],
      recentApplications: [],
      recentInterviews: [],
      logs: [],
    };

    // 1. Retrieve user context & current memories
    workingMemory.logs.push("Retrieving user context...");
    const userProfile = await AgentMemory.retrieveUserContext(userId);
    workingMemory.currentSkills = userProfile.skills;

    // 2. Goal decomposition
    workingMemory.logs.push(`Decomposing user goal: "${goalInput}"`);
    const decomposition = await GoalDecompositionEngine.decompose(
      userId,
      goalInput,
      userProfile
    );
    workingMemory.decomposition = decomposition;
    workingMemory.currentGoal = {
      id: decomposition.goalId,
      userId,
      rawInput: goalInput,
      targetRole: decomposition.targetRole,
      ...(decomposition.targetCompany ? { targetCompany: decomposition.targetCompany } : {}),
      timelineMonths: Math.ceil(decomposition.timelineWeeks / 4),
      createdAt: new Date().toISOString(),
    };

    // 3. Define multi-step tool plan
    const steps: AgentPlanStep[] = [
      {
        stepNumber: 1,
        reasoning: "Analyze the user's current profile strengths and skill density.",
        toolToExecute: "analyze_profile",
        parameters: {},
        status: "planned",
      },
      {
        stepNumber: 2,
        reasoning: "Compare target role requirements to locate technical/domain skill gaps.",
        toolToExecute: "analyze_missing_skills",
        parameters: {
          targetRole: decomposition.targetRole,
          currentSkills: workingMemory.currentSkills,
        },
        status: "planned",
      },
      {
        stepNumber: 3,
        reasoning: "Identify standard industry certifications to build credentials.",
        toolToExecute: "suggest_certifications",
        parameters: {}, // filled dynamically after step 2
        status: "planned",
      },
      {
        stepNumber: 4,
        reasoning: "Formulate concrete portfolio project suggestions addressing gaps.",
        toolToExecute: "recommend_projects",
        parameters: {}, // filled dynamically after step 2
        status: "planned",
      },
      {
        stepNumber: 5,
        reasoning: "Locate target hiring contacts and networking links on LinkedIn.",
        toolToExecute: "suggest_networking_targets",
        parameters: { targetCompany: decomposition.targetCompany },
        status: "planned",
      },
      {
        stepNumber: 6,
        reasoning: "Search active platform jobs matching the decomposed target criteria.",
        toolToExecute: "recommend_jobs",
        parameters: {
          targetRole: decomposition.targetRole,
          targetCompany: decomposition.targetCompany,
        },
        status: "planned",
      },
      {
        stepNumber: 7,
        reasoning: "Issue alert notification and link user directly to the new roadmap dashboard.",
        toolToExecute: "dispatch_notifications",
        parameters: {
          title: "Career Goal Activated",
          description: `Roadmap generated for ${decomposition.targetRole} at ${decomposition.targetCompany || "target companies"}.`,
          category: "ROADMAP_ACTIVATED",
          actionUrl: "/career-graph",
        },
        status: "planned",
      },
    ];

    let suggestedCertifications: any[] = [];
    let recommendedProjects: any[] = [];
    let networkingTargets: any[] = [];
    let recommendedJobs: any[] = [];

    // 4. Sequential tool execution
    for (const step of steps) {
      step.status = "executing";
      workingMemory.logs.push(`Executing Step ${step.stepNumber}: ${step.toolToExecute}`);

      // Inject dynamic parameters based on working memory state
      if (step.toolToExecute === "suggest_certifications") {
        step.parameters.missingSkills = workingMemory.missingSkills;
      } else if (step.toolToExecute === "recommend_projects") {
        step.parameters.missingSkills = workingMemory.missingSkills;
      }

      const result = await AgentToolbox.executeTool(userId, step.toolToExecute, step.parameters);

      if (result.success) {
        step.status = "completed";
        step.result = result.output;

        // Process outputs into working memory
        if (step.toolToExecute === "analyze_missing_skills") {
          workingMemory.missingSkills = result.output.gapSkills;
        } else if (step.toolToExecute === "suggest_certifications") {
          suggestedCertifications = result.output;
        } else if (step.toolToExecute === "recommend_projects") {
          recommendedProjects = result.output;
        } else if (step.toolToExecute === "suggest_networking_targets") {
          networkingTargets = result.output;
        } else if (step.toolToExecute === "recommend_jobs") {
          recommendedJobs = result.output;
        }
      } else {
        step.status = "failed";
        step.result = { error: result.error };
        workingMemory.logs.push(`Error executing ${step.toolToExecute}: ${result.error}`);
      }
    }

    // 5. Generate and save the final weekly roadmap
    workingMemory.logs.push("Synthesizing parameters into phased Career Roadmap...");
    const roadmap = await CareerRoadmapGenerator.generate(
      userId,
      decomposition.goalId,
      decomposition.targetRole,
      decomposition.targetCompany,
      decomposition.timelineWeeks,
      workingMemory.missingSkills,
      suggestedCertifications,
      recommendedProjects
    );

    workingMemory.roadmap = roadmap;

    // 6. Save relevant memories extracted from goal
    await AgentMemory.addMemory(userId, {
      type: "learning_goal",
      title: `Activated Career Goal: ${decomposition.targetRole}`,
      content: `Targeting role of ${decomposition.targetRole} ${decomposition.targetCompany ? `at ${decomposition.targetCompany}` : ""} within ${decomposition.timelineWeeks} weeks. Identified ${workingMemory.missingSkills.length} missing skill gaps to study.`,
      importance: 0.9,
      confidence: 0.95,
      metadata: {
        goalId: decomposition.goalId,
        targetRole: decomposition.targetRole,
        targetCompany: decomposition.targetCompany,
        timelineWeeks: decomposition.timelineWeeks,
      },
    });

    const report: AgentExecutionReport = {
      userId,
      goalInput,
      steps,
      workingMemory: {
        ...(workingMemory.currentGoal ? { currentGoal: workingMemory.currentGoal } : {}),
        profileSummary: userProfile.summary,
        currentSkills: workingMemory.currentSkills,
        missingSkills: workingMemory.missingSkills,
      },
      completedAt: new Date().toISOString(),
    };

    logger.info({ userId }, "[AutonomousCareerAgent] Planning cycle completed successfully.");
    return report;
  }
}
