import "server-only";
import { prisma } from "@/lib/db/prisma";
import { AnalyticsService } from "./analytics.service";
import { CareerOSService } from "./career-os.service";

export class DashboardQueryService {
  /**
   * Fetches exactly what the CommandCenter needs in one optimized Promise.all execution.
   * Avoids N+1 fanouts and huge payloads.
   */
  static async getCommandCenterView(userId: string) {
    const [profile, metrics, opportunities] = await Promise.all([
      CareerOSService.getOrCreateProfile(userId),
      AnalyticsService.getDashboardMetrics(userId).catch(() => ({ degraded: true, totalApplications: 0, totalResumes: 0, aiCost: 0, totalTokens: 0, resumeScore: 0 })),
      // Shallow fetch top opportunities
      prisma.jobOpportunity.findMany({
        where: { userId },
        orderBy: { matchScore: "desc" },
        take: 10,
        select: { id: true, company: true, role: true, matchScore: true }
      }).catch(() => []),
    ]);

    return {
      profile,
      metrics,
      opportunities,
      activeWorkflows: [],
      pendingApprovalsCount: 0,
      isNewUser: true
    };
  }

  /**
   * Fetches the Agent Runs view cleanly without over-fetching the entire agent execution history.
   */
  static async getAgentRunsView(userId: string) {
    const [profile, memories] = await Promise.all([
      CareerOSService.getOrCreateProfile(userId),
      // Shallow fetch memories
      prisma.careerMemory.findMany({
        where: { userId },
        orderBy: { confidence: "desc" },
        take: 8,
        select: { id: true, type: true, confidence: true, title: true, content: true }
      }).catch(() => [])
    ]);

    return {
      profile,
      recentWorkflows: [],
      activeCount: 0,
      completedCount: 0,
      pendingApprovals: [],
      memories
    };
  }

  /**
   * Aggregated initial load for the Execution Viewer page.
   * Single Promise.all — never crashes, always returns partial data.
   */
  static async getWorkflowExecutionView(workflowId: string, userId: string) {
    const [execution, domActions, reasoning, screenshots] = await Promise.all([
      prisma.browserExecution.findFirst({
        where: { workflowId, userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, status: true, currentUrl: true,
          currentTitle: true, startedAt: true, metadata: true
        }
      }).catch(() => null),

      prisma.dOMAction.findMany({
        where: { workflowId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true, actionType: true, selector: true,
          value: true, url: true, success: true,
          errorMessage: true, createdAt: true
        }
      }).catch(() => []),

      prisma.executionReasoning.findMany({
        where: { workflowId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, decision: true, reasoning: true,
          confidence: true, createdAt: true
        }
      }).catch(() => []),

      prisma.executionScreenshot.findMany({
        where: { workflowId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, url: true, storageKey: true, createdAt: true }
      }).catch(() => []),
    ]);

    return {
      workflow: null,
      execution,
      domActions: domActions.reverse(),
      reasoning,
      latestScreenshot: screenshots[0] ?? null,
      screenshots,
      events: []
    };
  }
}
