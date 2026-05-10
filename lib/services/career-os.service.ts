import "server-only";
import {
  AgentRunStatus,
  ApprovalStatus,
  Prisma,
  WorkflowStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditEvent } from "@/lib/domain/audit/audit.service";
import { requireUser } from "@/lib/auth/require-user";

// ── Schema-aware error detection ──────────────────────────────────────────────

function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2021"
  );
}

const DEFAULT_AUTONOMY_POLICY: Prisma.InputJsonObject = {
  mode: "manual",
  maxApplicationsPerDay: 0,
  approvalRequiredFor: [
    "application_submit",
    "recruiter_message",
    "sensitive_form_field",
    "salary_expectation",
  ],
};

const DEFAULT_WORKFLOW_PLAN: Prisma.InputJsonObject = {
  steps: [
    { key: "retrieve_memory", agent: "planner", status: "planned" },
    { key: "rank_opportunities", agent: "job_matching", status: "planned" },
    { key: "prepare_application_packet", agent: "resume_optimization", status: "planned" },
    { key: "request_human_approval", agent: "planner", status: "planned" },
  ],
};

type JsonRecord = Record<string, unknown>;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

export class CareerOSService {
  static async getOrCreateProfile(userId: string) {
    // 1. Domain Boundary: Guarantee the user exists before proceeding
    // This prevents foreign key errors if the session outlives a DB reset
    await requireUser(userId);

    const existing = await prisma.careerProfile.findUnique({ where: { userId } });
    if (existing) return existing;

    const profile = await prisma.careerProfile.create({
      data: {
        userId,
        goals: {},
        preferences: {},
        constraints: {},
        autonomyPolicy: DEFAULT_AUTONOMY_POLICY,
      },
    });

    await writeAuditEvent({
      userId,
      action: "career_profile.created",
      entityType: "CareerProfile",
      entityId: profile.id,
    });

    return profile;
  }

  static async updateProfile(userId: string, data: {
    headline?: string | null | undefined;
    summary?: string | null | undefined;
    goals?: JsonRecord | undefined;
    preferences?: JsonRecord | undefined;
    constraints?: JsonRecord | undefined;
    salaryExpectation?: JsonRecord | null | undefined;
    autonomyPolicy?: JsonRecord | undefined;
  }) {
    const profile = await prisma.careerProfile.upsert({
      where: { userId },
      create: compact({
        userId,
        headline: data.headline,
        summary: data.summary,
        goals: asJson(data.goals ?? {}),
        preferences: asJson(data.preferences ?? {}),
        constraints: asJson(data.constraints ?? {}),
        salaryExpectation: data.salaryExpectation ? asJson(data.salaryExpectation) : undefined,
        autonomyPolicy: asJson(data.autonomyPolicy ?? DEFAULT_AUTONOMY_POLICY),
      }) as Prisma.CareerProfileUncheckedCreateInput,
      update: compact({
        headline: data.headline,
        summary: data.summary,
        goals: data.goals === undefined ? undefined : asJson(data.goals),
        preferences: data.preferences === undefined ? undefined : asJson(data.preferences),
        constraints: data.constraints === undefined ? undefined : asJson(data.constraints),
        salaryExpectation: data.salaryExpectation === undefined ? undefined : asJson(data.salaryExpectation),
        autonomyPolicy: data.autonomyPolicy === undefined ? undefined : asJson(data.autonomyPolicy),
      }) as Prisma.CareerProfileUncheckedUpdateInput,
    });

    await writeAuditEvent({
      userId,
      action: "career_profile.updated",
      entityType: "CareerProfile",
      entityId: profile.id,
    });

    return profile;
  }

  static async listMemories(userId: string, filters?: { type?: string | undefined; limit?: number | undefined }) {
    return prisma.careerMemory.findMany({
      where: compact({
        userId,
        type: filters?.type,
      }) as Prisma.CareerMemoryWhereInput,
      orderBy: { updatedAt: "desc" },
      take: Math.min(filters?.limit ?? 50, 100),
    });
  }

  static async createMemory(userId: string, data: {
    type: string;
    title: string;
    content: string;
    evidenceRef?: string | null | undefined;
    confidence?: number | undefined;
    source?: string | undefined;
    visibility?: string | undefined;
    metadata?: JsonRecord | undefined;
    expiresAt?: Date | null | undefined;
  }) {
    const memory = await prisma.careerMemory.create({
      data: compact({
        userId,
        type: data.type,
        title: data.title,
        content: data.content,
        evidenceRef: data.evidenceRef,
        confidence: data.confidence ?? 0.7,
        source: data.source ?? "user",
        visibility: data.visibility ?? "private",
        metadata: data.metadata ? asJson(data.metadata) : undefined,
        expiresAt: data.expiresAt,
      }) as Prisma.CareerMemoryUncheckedCreateInput,
    });

    await writeAuditEvent({
      userId,
      action: "career_memory.created",
      entityType: "CareerMemory",
      entityId: memory.id,
      metadata: { type: memory.type },
    });

    return memory;
  }

  static async updateMemory(userId: string, id: string, data: {
    type?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
    evidenceRef?: string | null | undefined;
    confidence?: number | undefined;
    source?: string | undefined;
    visibility?: string | undefined;
    metadata?: JsonRecord | null | undefined;
    expiresAt?: Date | null | undefined;
  }) {
    const memory = await prisma.careerMemory.update({
      where: { id, userId },
      data: compact({
        type: data.type,
        title: data.title,
        content: data.content,
        evidenceRef: data.evidenceRef,
        confidence: data.confidence,
        source: data.source,
        visibility: data.visibility,
        metadata: data.metadata === undefined ? undefined : asJson(data.metadata),
        expiresAt: data.expiresAt,
      }) as Prisma.CareerMemoryUncheckedUpdateInput,
    });

    await writeAuditEvent({
      userId,
      action: "career_memory.updated",
      entityType: "CareerMemory",
      entityId: memory.id,
      metadata: { type: memory.type },
    });

    return memory;
  }

  static async deleteMemory(userId: string, id: string) {
    await prisma.careerMemory.delete({ where: { id, userId } });
    await writeAuditEvent({
      userId,
      action: "career_memory.deleted",
      entityType: "CareerMemory",
      entityId: id,
    });
  }

  static async listWorkflowRuns(userId: string, limit = 20) {
    try {
      return await prisma.workflowRun.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: Math.min(limit, 100),
        include: {
          agentRuns: {
            orderBy: { createdAt: "desc" },
            include: { steps: { orderBy: { createdAt: "asc" } } },
          },
          approvalRequests: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } catch (err: unknown) {
      if (isMissingTableError(err)) {
        console.warn("[CareerOSService] listWorkflowRuns — schema not ready (P2021)");
        return [];
      }
      throw err;
    }
  }

  static async getWorkflowRun(userId: string, id: string) {
    try {
      return await prisma.workflowRun.findFirst({
        where: { id, userId },
        include: {
          agentRuns: {
            orderBy: { createdAt: "desc" },
            include: { steps: { orderBy: { createdAt: "asc" } } },
          },
          approvalRequests: { orderBy: { createdAt: "desc" } },
        },
      });
    } catch (err: unknown) {
      if (isMissingTableError(err)) return null;
      throw err;
    }
  }

  static async createWorkflowRun(userId: string, data: {
    type: string;
    goal: string;
    status?: WorkflowStatus | undefined;
    plan?: JsonRecord | undefined;
    policy?: JsonRecord | undefined;
    metadata?: JsonRecord | undefined;
  }) {
    const workflow = await prisma.workflowRun.create({
      data: compact({
        userId,
        type: data.type,
        status: data.status ?? "planned",
        goal: data.goal,
        plan: asJson(data.plan ?? DEFAULT_WORKFLOW_PLAN),
        policy: data.policy ? asJson(data.policy) : undefined,
        metadata: data.metadata ? asJson(data.metadata) : undefined,
        agentRuns: {
          create: {
            userId,
            agentType: "planner",
            status: "planned",
            input: asJson({ goal: data.goal, workflowType: data.type }),
            output: asJson({ plan: data.plan ?? DEFAULT_WORKFLOW_PLAN }),
            steps: {
              create: [
                {
                  stepType: "planning",
                  status: "completed",
                  summary: "Created initial workflow plan and queued approval-safe agent steps.",
                  output: asJson({ plan: data.plan ?? DEFAULT_WORKFLOW_PLAN }),
                  completedAt: new Date(),
                },
              ],
            },
          },
        },
      }) as Prisma.WorkflowRunUncheckedCreateInput,
      include: {
        agentRuns: { include: { steps: true } },
        approvalRequests: true,
      },
    });

    await writeAuditEvent({
      userId,
      action: "workflow.created",
      entityType: "WorkflowRun",
      entityId: workflow.id,
      metadata: { type: workflow.type, status: workflow.status },
    });

    return workflow;
  }

  static async updateWorkflowStatus(userId: string, id: string, status: WorkflowStatus) {
    const workflow = await prisma.workflowRun.update({
      where: { id, userId },
      data: compact({
        status,
        completedAt: ["completed", "failed", "canceled"].includes(status) ? new Date() : undefined,
      }) as Prisma.WorkflowRunUncheckedUpdateInput,
    });

    await writeAuditEvent({
      userId,
      action: "workflow.status_updated",
      entityType: "WorkflowRun",
      entityId: workflow.id,
      metadata: { status },
    });

    return workflow;
  }

  static async createAgentRun(userId: string, data: {
    workflowId?: string | undefined;
    agentType: string;
    status?: AgentRunStatus | undefined;
    input?: JsonRecord | undefined;
    output?: JsonRecord | undefined;
  }) {
    return prisma.agentRun.create({
      data: compact({
        userId,
        workflowId: data.workflowId,
        agentType: data.agentType,
        status: data.status ?? "planned",
        input: data.input ? asJson(data.input) : undefined,
        output: data.output ? asJson(data.output) : undefined,
      }) as Prisma.AgentRunUncheckedCreateInput,
    });
  }

  static async listApprovalRequests(userId: string, status?: ApprovalStatus) {
    try {
      return await prisma.approvalRequest.findMany({
        where: compact({ userId, status }) as Prisma.ApprovalRequestWhereInput,
        orderBy: { createdAt: "desc" },
        include: {
          workflow: {
            select: { id: true, type: true, goal: true, status: true },
          },
        },
      });
    } catch (err: unknown) {
      if (isMissingTableError(err)) {
        console.warn("[CareerOSService] listApprovalRequests — schema not ready (P2021)");
        return [];
      }
      throw err;
    }
  }

  static async createApprovalRequest(userId: string, data: {
    workflowId?: string | undefined;
    type: string;
    title: string;
    summary: string;
    payload: JsonRecord;
    riskFlags?: JsonRecord | undefined;
    expiresAt?: Date | null | undefined;
  }) {
    const approval = await prisma.approvalRequest.create({
      data: compact({
        userId,
        workflowId: data.workflowId,
        type: data.type,
        title: data.title,
        summary: data.summary,
        payload: asJson(data.payload),
        riskFlags: data.riskFlags ? asJson(data.riskFlags) : undefined,
        expiresAt: data.expiresAt,
      }) as Prisma.ApprovalRequestUncheckedCreateInput,
    });

    await writeAuditEvent({
      userId,
      action: "approval.requested",
      entityType: "ApprovalRequest",
      entityId: approval.id,
      metadata: { type: approval.type },
    });

    return approval;
  }

  static async decideApproval(userId: string, id: string, decision: "approved" | "rejected", data?: JsonRecord) {
    const approval = await prisma.approvalRequest.update({
      where: { id, userId },
      data: compact({
        status: decision,
        decision: data ? asJson(data) : undefined,
        decidedAt: new Date(),
      }) as Prisma.ApprovalRequestUncheckedUpdateInput,
    });

    await writeAuditEvent({
      userId,
      action: `approval.${decision}`,
      entityType: "ApprovalRequest",
      entityId: approval.id,
      metadata: { type: approval.type },
    });

    return approval;
  }
}
