/**
 * lib/agent/tools.ts
 *
 * Tool Execution Framework for the Autonomous Career Agent.
 * Integrates directly with CareerOS schemas and services.
 */

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { geminiJSON } from "@/lib/ai/core";
import { z } from "zod";
import type { AgentToolType, AgentToolResult } from "./types";

export class AgentToolbox {
  /**
   * Dispatches a tool name and parameters to the correct execution handler.
   */
  static async executeTool(
    userId: string,
    toolName: AgentToolType,
    params: Record<string, any>
  ): Promise<AgentToolResult> {
    logger.info({ userId, toolName, params }, "[AgentToolbox] Executing tool...");
    try {
      let output: any;

      switch (toolName) {
        case "analyze_profile":
          output = await this.analyzeProfile(userId);
          break;
        case "analyze_missing_skills":
          output = await this.analyzeMissingSkills(userId, params.targetRole, params.currentSkills);
          break;
        case "suggest_certifications":
          output = await this.suggestCertifications(userId, params.missingSkills);
          break;
        case "recommend_projects":
          output = await this.recommendProjects(userId, params.targetRole, params.missingSkills);
          break;
        case "suggest_networking_targets":
          output = await this.suggestNetworkingTargets(userId, params.targetCompany);
          break;
        case "recommend_jobs":
          output = await this.recommendJobs(userId, params.targetRole, params.targetCompany);
          break;
        case "dispatch_notifications":
          output = await this.dispatchNotifications(userId, params.title, params.description, params.category, params.actionUrl);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return {
        toolName,
        success: true,
        output,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ userId, toolName, err }, "[AgentToolbox] Tool execution failed");
      return {
        toolName,
        success: false,
        output: null,
        error: errMsg,
      };
    }
  }

  // ─── Tool implementations ───────────────────────────────────────────────────

  private static async analyzeProfile(userId: string) {
    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    const resumeData = (resume?.data as Record<string, any>) ?? {};
    const skills = (resumeData.skills as string[]) ?? [];
    const experienceCount = ((resumeData.experience as any[]) ?? []).length;
    const projectCount = ((resumeData.projects as any[]) ?? []).length;

    return {
      hasResume: !!resume,
      resumeTitle: resume?.title ?? null,
      currentSkills: skills,
      experienceCount,
      projectCount,
    };
  }

  private static async analyzeMissingSkills(
    userId: string,
    targetRole: string,
    currentSkills: string[]
  ) {
    // 1. Check existing SkillGapAnalysis
    const existing = await prisma.skillGapAnalysis.findUnique({
      where: { userId_targetRole: { userId, targetRole } },
    });

    if (existing) {
      return {
        gapSkills: (existing.gapSkills as any[]).map((s) => s.name || s.skill || s),
        estimatedWeeks: existing.estimatedWeeks,
      };
    }

    // 2. Compute via LLM if none exists
    const schema = z.object({
      gapSkills: z.array(z.string()),
      estimatedWeeks: z.number(),
    });

    const systemPrompt = `You are a career gap intelligence engine. Compare the user's current skills to the target role. List the missing skills they must learn. Estimating weeks to cover these gaps.`;
    const userPrompt = `Target Role: ${targetRole}\nCurrent Skills: ${currentSkills.join(", ")}`;

    const response = await geminiJSON({
      system: systemPrompt,
      user: userPrompt,
      fallback: { gapSkills: ["System Design", "Distributed Caching"], estimatedWeeks: 12 },
      schema,
    });

    // Save it
    await prisma.skillGapAnalysis.upsert({
      where: { userId_targetRole: { userId, targetRole } },
      create: {
        userId,
        targetRole,
        currentSkills: currentSkills.map((s) => ({ name: s, level: 0.8 })),
        requiredSkills: response.gapSkills.map((s) => ({ name: s, level: 0.8 })),
        gapSkills: response.gapSkills.map((s) => ({ name: s, marketDemandScore: 8 })),
        estimatedWeeks: response.estimatedWeeks,
      },
      update: {
        gapSkills: response.gapSkills.map((s) => ({ name: s, marketDemandScore: 8 })),
        estimatedWeeks: response.estimatedWeeks,
      },
    });

    return response;
  }

  private static async suggestCertifications(userId: string, missingSkills: string[]) {
    if (!missingSkills || missingSkills.length === 0) {
      return [];
    }

    const schema = z.object({
      suggestions: z.array(
        z.object({
          name: z.string(),
          issuer: z.string(),
          difficulty: z.enum(["beginner", "intermediate", "advanced"]),
          estimatedWeeks: z.number(),
          url: z.string().optional(),
        })
      ),
    });

    const systemPrompt = `Suggest widely recognized industry certifications for the following missing skills. Ensure they are specific and useful for CV boost.`;
    const userPrompt = `Missing Skills: ${missingSkills.join(", ")}`;

    const result = await geminiJSON({
      system: systemPrompt,
      user: userPrompt,
      fallback: {
        suggestions: [
          { name: "AWS Certified Developer", issuer: "Amazon Web Services", difficulty: "intermediate", estimatedWeeks: 6 },
        ],
      },
      schema,
    });

    return result.suggestions;
  }

  private static async recommendProjects(
    userId: string,
    targetRole: string,
    missingSkills: string[]
  ) {
    const schema = z.object({
      projects: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          techStack: z.array(z.string()),
          difficulty: z.string(),
          expectedImpact: z.string(),
        })
      ),
    });

    const systemPrompt = `Generate 2 high-impact side project ideas to demonstrate competency in target role and close missing skills gaps. Specify features, tech stack, and what it proves.`;
    const userPrompt = `Target Role: ${targetRole}\nMissing Skills: ${missingSkills.join(", ")}`;

    const result = await geminiJSON({
      system: systemPrompt,
      user: userPrompt,
      fallback: {
        projects: [
          {
            title: "Distributed Task Scheduler",
            description: "High-performance job queue supporting delayed triggers.",
            techStack: ["Rust", "Redis", "gRPC"],
            difficulty: "Advanced",
            expectedImpact: "Proves systems engineering, concurrency, and caching depth.",
          },
        ],
      },
      schema,
    });

    return result.projects;
  }

  private static async suggestNetworkingTargets(userId: string, targetCompany?: string) {
    // Look up target contacts in the hiring contacts or return generic roles to target
    const contacts = await prisma.hiringContact.findMany({
      where: targetCompany
        ? { company: { contains: targetCompany, mode: "insensitive" } }
        : {},
      take: 3,
    });

    if (contacts.length > 0) {
      return contacts.map((c) => ({
        name: c.name,
        title: c.title,
        company: c.company,
        linkedinUrl: c.linkedinUrl,
      }));
    }

    // Fallback: list target profiles to look for on LinkedIn
    const targetRoles = ["Engineering Manager", "Technical Recruiter", "Staff Software Engineer"];
    return targetRoles.map((role) => ({
      name: "LinkedIn Target Profile",
      title: role,
      company: targetCompany || "Target Tech Companies",
      linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        `${role} ${targetCompany || ""}`
      )}`,
    }));
  }

  private static async recommendJobs(
    userId: string,
    targetRole: string,
    targetCompany?: string
  ) {
    // Search existing job opportunities matching role
    const jobs = await prisma.jobOpportunity.findMany({
      where: {
        OR: [
          { role: { contains: targetRole, mode: "insensitive" } },
          targetCompany ? { company: { contains: targetCompany, mode: "insensitive" } } : {},
        ],
      },
      orderBy: { matchScore: "desc" },
      take: 5,
    });

    return jobs.map((j) => ({
      id: j.id,
      company: j.company,
      role: j.role,
      location: j.location,
      salaryRange: j.salaryRange,
      matchScore: j.matchScore,
      sourceUrl: j.sourceUrl,
    }));
  }

  private static async dispatchNotifications(
    userId: string,
    title: string,
    description: string,
    category: string,
    actionUrl: string
  ) {
    const notification = await prisma.actionFeedItem.create({
      data: {
        userId,
        priority: 10, // high priority for agent activities
        title,
        description,
        actionUrl,
        category, // e.g. "INTERVIEW_PREP"
      },
    });

    return {
      notificationId: notification.id,
      dispatched: true,
    };
  }
}
