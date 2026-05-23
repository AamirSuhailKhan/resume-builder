import "server-only";
import { Prisma } from "@prisma/client";
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
}
