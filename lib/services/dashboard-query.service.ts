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
    const [profile, metrics, opportunities, activeWorkflows, pendingApprovalsCount, totalWorkflowsCount] = await Promise.all([
      CareerOSService.getOrCreateProfile(userId),
      AnalyticsService.getDashboardMetrics(userId).catch(() => ({ degraded: true, totalApplications: 0, totalResumes: 0, aiCost: 0, totalTokens: 0, resumeScore: 0 })),
      // Shallow fetch top opportunities
      prisma.jobOpportunity.findMany({
        where: { userId },
        orderBy: { matchScore: "desc" },
        take: 10,
        select: { id: true, company: true, role: true, matchScore: true }
      }).catch(() => []),
      // Shallow fetch active workflows only
      prisma.workflowRun.findMany({
        where: { userId, status: { in: ["queued", "running", "retrying", "waiting_for_approval"] } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, goal: true, type: true, status: true }
      }).catch(() => []),
      // Just count pending approvals
      prisma.approvalRequest.count({
        where: { userId, status: "pending" }
      }).catch(() => 0),
      // Just check if user has any workflows for onboarding state
      prisma.workflowRun.count({ where: { userId } }).catch(() => 0)
    ]);

    return {
      profile,
      metrics,
      opportunities,
      activeWorkflows,
      pendingApprovalsCount,
      isNewUser: totalWorkflowsCount === 0
    };
  }

  /**
   * Fetches the Agent Runs view cleanly without over-fetching the entire agent execution history.
   */
  static async getAgentRunsView(userId: string) {
    const [profile, recentWorkflows, workflowCounts, pendingApprovals, memories] = await Promise.all([
      CareerOSService.getOrCreateProfile(userId),
      // Fetch latest 12 workflows but ONLY include the 1 most recent agent run + step
      prisma.workflowRun.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          goal: true,
          type: true,
          status: true,
          updatedAt: true,
          agentRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              agentType: true,
              status: true,
              steps: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { summary: true }
              }
            }
          },
          _count: {
            select: { agentRuns: true }
          }
        }
      }).catch(() => []),
      // Fast aggregation for all-time status counts
      prisma.workflowRun.groupBy({
        by: ['status'],
        where: { userId },
        _count: true
      }).catch(() => []),
      // Shallow fetch pending approvals
      prisma.approvalRequest.findMany({
        where: { userId, status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, summary: true, type: true, createdAt: true }
      }).catch(() => []),
      // Shallow fetch memories
      prisma.careerMemory.findMany({
        where: { userId },
        orderBy: { confidence: "desc" },
        take: 8,
        select: { id: true, type: true, confidence: true, title: true, content: true }
      }).catch(() => [])
    ]);

    // Compute active vs completed using grouped counts
    let activeCount = 0;
    let completedCount = 0;
    
    for (const group of workflowCounts) {
      if (["queued", "running", "retrying", "waiting_for_approval"].includes(group.status)) {
        activeCount += group._count;
      } else if (group.status === "completed") {
        completedCount += group._count;
      }
    }

    return {
      profile,
      recentWorkflows,
      activeCount,
      completedCount,
      pendingApprovals,
      memories
    };
  }

  /**
   * Aggregated initial load for the Execution Viewer page.
   * Single Promise.all — never crashes, always returns partial data.
   */
  static async getWorkflowExecutionView(workflowId: string, userId: string) {
    const [workflow, execution, domActions, reasoning, screenshots, events] = await Promise.all([
      prisma.workflowRun.findFirst({
        where: { id: workflowId, userId },
        select: {
          id: true, goal: true, type: true, status: true,
          createdAt: true, updatedAt: true, completedAt: true,
          agentRuns: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true, agentType: true, status: true,
              startedAt: true, completedAt: true, costUsd: true,
              steps: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { summary: true, status: true }
              }
            }
          }
        }
      }).catch(() => null),

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

      prisma.workflowEvent.findMany({
        where: { workflowId, userId },
        orderBy: { sequence: "desc" },
        take: 50,
        select: {
          id: true, type: true, source: true,
          payload: true, sequence: true, createdAt: true
        }
      }).catch(() => [])
    ]);

    return {
      workflow,
      execution,
      domActions: domActions.reverse(),
      reasoning,
      latestScreenshot: screenshots[0] ?? null,
      screenshots,
      events: events.reverse()
    };
  }
}
