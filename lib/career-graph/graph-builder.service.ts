/**
 * graph-builder.service.ts
 * Extracts graph nodes/edges from existing CareerOS data.
 * Called whenever a resume is uploaded, a job applied, etc.
 */
import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { GraphService } from "./graph.service";
import type { GraphNodeKind, GraphEdgeKind, GraphUpdateTrigger } from "./types";

// ─── Resume → Graph ───────────────────────────────────────────────────────────

async function buildFromResume(userId: string, resumeId: string): Promise<void> {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId, userId },
  });
  if (!resume) return;

  const data = resume.data as Record<string, unknown>;

  // Deactivate old nodes from this resume source
  await GraphService.deactivateBySource(userId, resumeId, "Resume");

  // ── Skills ──────────────────────────────────────────────────────────────────
  const skills = (data.skills as string[]) ?? [];
  const skillNodeIds: string[] = [];
  for (const skill of skills) {
    const nodeId = await GraphService.upsertNode(
      userId,
      "SKILL" as GraphNodeKind,
      skill,
      {
        name: skill,
        category: "general",
        proficiencyLevel: 0.6,
        yearsOfExperience: 0,
        lastUsed: null,
        marketDemand: 0.5,
        isVerified: false,
        sources: ["resume"],
      },
      { weight: 0.7, confidence: 0.8, sourceEntityId: resumeId, sourceEntityType: "Resume" }
    );
    skillNodeIds.push(nodeId);
  }

  // ── Experience ──────────────────────────────────────────────────────────────
  const experiences = (data.experience as Array<Record<string, unknown>>) ?? [];
  for (const exp of experiences) {
    const label = `${exp.title as string} @ ${exp.company as string}`;
    const expNodeId = await GraphService.upsertNode(
      userId,
      "EXPERIENCE" as GraphNodeKind,
      label,
      {
        company: exp.company as string,
        role: exp.title as string,
        startDate: exp.startDate as string,
        endDate: (exp.endDate as string) ?? null,
        isCurrent: !exp.endDate,
        location: (exp.location as string) ?? null,
        description: (exp.description as string) ?? "",
        achievements: (exp.achievements as string[]) ?? [],
        teamSize: null,
        skills: (exp.skills as string[]) ?? [],
      },
      { weight: 0.9, confidence: 0.85, sourceEntityId: resumeId, sourceEntityType: "Resume" }
    );

    // Company node
    if (exp.company) {
      const companyNodeId = await GraphService.upsertNode(
        userId,
        "COMPANY" as GraphNodeKind,
        exp.company as string,
        {
          name: exp.company as string,
          domain: null,
          industry: null,
          tier: null,
          hiringStatus: "unknown",
          trustScore: 0.5,
        },
        { weight: 0.6, confidence: 0.6 }
      );
      await GraphService.upsertEdge(userId, expNodeId, companyNodeId, "WORKED_AT" as GraphEdgeKind, { weight: 1 });
    }

    // Experience → Skills edges
    const expSkills = (exp.skills as string[]) ?? [];
    for (const skill of expSkills) {
      const sNodeId = await GraphService.upsertNode(
        userId,
        "SKILL" as GraphNodeKind,
        skill,
        {
          name: skill,
          category: "general",
          proficiencyLevel: 0.7,
          yearsOfExperience: 0,
          lastUsed: null,
          marketDemand: 0.5,
          isVerified: false,
          sources: ["resume", "experience"],
        },
        { weight: 0.7, confidence: 0.8, sourceEntityId: resumeId, sourceEntityType: "Resume" }
      );
      await GraphService.upsertEdge(userId, expNodeId, sNodeId, "USED_IN" as GraphEdgeKind, { weight: 0.8 });
    }
  }

  // ── Projects ────────────────────────────────────────────────────────────────
  const projects = (data.projects as Array<Record<string, unknown>>) ?? [];
  for (const proj of projects) {
    const projectNodeId = await GraphService.upsertNode(
      userId,
      "PROJECT" as GraphNodeKind,
      (proj.name as string) ?? "Untitled Project",
      {
        name: (proj.name as string) ?? "Untitled Project",
        description: (proj.description as string) ?? "",
        techStack: (proj.technologies as string[]) ?? [],
        url: (proj.url as string) ?? null,
        impact: (proj.impact as string) ?? null,
        startDate: (proj.startDate as string) ?? null,
        endDate: (proj.endDate as string) ?? null,
      },
      { weight: 0.75, confidence: 0.8, sourceEntityId: resumeId, sourceEntityType: "Resume" }
    );

    // Project → Skills edges
    const techStack = (proj.technologies as string[]) ?? [];
    for (const tech of techStack) {
      const sNodeId = await GraphService.upsertNode(
        userId,
        "SKILL" as GraphNodeKind,
        tech,
        {
          name: tech,
          category: "technical",
          proficiencyLevel: 0.6,
          yearsOfExperience: 0,
          lastUsed: null,
          marketDemand: 0.5,
          isVerified: false,
          sources: ["resume", "project"],
        },
        { weight: 0.6, confidence: 0.75, sourceEntityId: resumeId, sourceEntityType: "Resume" }
      );
      await GraphService.upsertEdge(userId, projectNodeId, sNodeId, "BUILT" as GraphEdgeKind, { weight: 0.7 });
    }
  }

  // ── Education ───────────────────────────────────────────────────────────────
  const education = (data.education as Array<Record<string, unknown>>) ?? [];
  for (const edu of education) {
    await GraphService.upsertNode(
      userId,
      "EDUCATION" as GraphNodeKind,
      `${edu.degree as string} @ ${edu.school as string}`,
      {
        institution: edu.school as string,
        degree: edu.degree as string,
        field: (edu.field as string) ?? "",
        gpa: (edu.gpa as number) ?? null,
        startYear: parseInt(edu.startYear as string) || 2020,
        endYear: edu.endYear ? parseInt(edu.endYear as string) : null,
        achievements: (edu.achievements as string[]) ?? [],
      },
      { weight: 0.6, confidence: 0.9, sourceEntityId: resumeId, sourceEntityType: "Resume" }
    );
  }
}

// ─── Application → Graph ──────────────────────────────────────────────────────

async function buildFromApplication(userId: string, applicationId: string): Promise<void> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId, userId },
    include: { jobOpportunity: true },
  });
  if (!app) return;

  const appNodeId = await GraphService.upsertNode(
    userId,
    "APPLICATION" as GraphNodeKind,
    `${app.role} @ ${app.company}`,
    {
      company: app.company,
      role: app.role,
      status: app.status as "applied" | "interview" | "offer" | "rejected",
      appliedAt: (app.appliedAt ?? app.createdAt).toISOString(),
      source: app.jobOpportunity?.sourceUrl ?? null,
      matchScore: app.matchScore,
      jobOpportunityId: app.jobOpportunityId ?? null,
    },
    { weight: 0.8, confidence: 0.95, sourceEntityId: applicationId, sourceEntityType: "Application" }
  );

  // Company node
  const companyNodeId = await GraphService.upsertNode(
    userId,
    "COMPANY" as GraphNodeKind,
    app.company,
    {
      name: app.company,
      domain: null,
      industry: null,
      tier: null,
      hiringStatus: "unknown",
      trustScore: 0.5,
    },
    { weight: 0.6, confidence: 0.7 }
  );

  await GraphService.upsertEdge(userId, appNodeId, companyNodeId, "APPLIED_TO" as GraphEdgeKind, { weight: 0.9 });

  // Job match node if we have a job opportunity
  if (app.jobOpportunity) {
    const jd = app.jobOpportunity;
    const matchNodeId = await GraphService.upsertNode(
      userId,
      "JOB_MATCH" as GraphNodeKind,
      `Match: ${jd.role} @ ${jd.company}`,
      {
        jobOpportunityId: jd.id,
        company: jd.company,
        role: jd.role,
        matchScore: jd.matchScore,
        matchedAt: jd.createdAt.toISOString(),
        missingSkills: [],
        matchedSkills: [],
      },
      { weight: 0.7, confidence: 0.85, sourceEntityId: jd.id, sourceEntityType: "JobOpportunity" }
    );
    await GraphService.upsertEdge(userId, appNodeId, matchNodeId, "MATCHED_TO" as GraphEdgeKind, {
      weight: jd.matchScore / 100,
    });
  }
}

// ─── Interview → Graph ────────────────────────────────────────────────────────

async function buildFromInterview(userId: string, sessionId: string, outcome: string): Promise<void> {
  const session = await prisma.interviewMockSession.findUnique({
    where: { id: sessionId, userId },
    include: { company: true },
  });
  if (!session) return;

  const companyName = session.company?.name ?? "Unknown";

  const interviewNodeId = await GraphService.upsertNode(
    userId,
    "INTERVIEW" as GraphNodeKind,
    `Interview: ${session.roleTitle} @ ${companyName}`,
    {
      company: companyName,
      role: session.roleTitle,
      roundType: session.mode,
      scheduledAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      outcome: outcome as "passed" | "failed" | "pending" | "cancelled",
      feedback: null,
      score: (session.scores as Record<string, unknown>)?.overall as number ?? null,
    },
    { weight: 0.85, confidence: 0.9, sourceEntityId: sessionId, sourceEntityType: "InterviewMockSession" }
  );

  // Link interview to company
  const companyNodeId = await GraphService.upsertNode(
    userId,
    "COMPANY" as GraphNodeKind,
    companyName,
    {
      name: companyName,
      domain: null,
      industry: null,
      tier: null,
      hiringStatus: "unknown",
      trustScore: 0.5,
    },
    { weight: 0.5, confidence: 0.6 }
  );

  await GraphService.upsertEdge(userId, interviewNodeId, companyNodeId, "INTERVIEWED_AT" as GraphEdgeKind, { weight: 0.9 });
}

// ─── SkillGap → Graph ─────────────────────────────────────────────────────────

async function buildFromSkillGaps(userId: string): Promise<void> {
  const gaps = await prisma.skillGapAnalysis.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  for (const gap of gaps) {
    const gapSkills = (gap.gapSkills as Array<Record<string, unknown>>) ?? [];
    for (const g of gapSkills) {
      const skillName = g.name as string;
      if (!skillName) continue;
      await GraphService.upsertNode(
        userId,
        "SKILL_GAP" as GraphNodeKind,
        `Gap: ${skillName} for ${gap.targetRole}`,
        {
          skill: skillName,
          targetRole: gap.targetRole,
          currentLevel: (g.currentLevel as number) ?? 0.2,
          requiredLevel: (g.requiredLevel as number) ?? 0.8,
          priority: (g.marketDemandScore as number) ?? 0.5,
          marketDemand: (g.marketDemandScore as number) ?? 0.5,
          estimatedWeeks: gap.estimatedWeeks,
          status: "open",
        },
        { weight: 0.8, confidence: 0.8, sourceEntityId: gap.id, sourceEntityType: "SkillGapAnalysis" }
      );
    }
  }
}

// ─── Negotiation / Offer → Graph ─────────────────────────────────────────────

async function buildFromOffers(userId: string): Promise<void> {
  const negotiations = await prisma.negotiationSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const neg of negotiations) {
    const offerNodeId = await GraphService.upsertNode(
      userId,
      "OFFER" as GraphNodeKind,
      `Offer: ${neg.jobTitle} @ ${neg.companyName}`,
      {
        company: neg.companyName,
        role: neg.jobTitle,
        baseAmount: neg.offerBase,
        totalCtc: neg.finalOffer ?? neg.offerBase,
        currency: neg.currency,
        receivedAt: neg.createdAt.toISOString(),
        expiresAt: null,
        status: neg.outcome === "accepted" ? "accepted" : neg.outcome === "rejected" ? "rejected" : "pending",
      },
      { weight: 0.9, confidence: 0.95, sourceEntityId: neg.id, sourceEntityType: "NegotiationSession" }
    );

    const companyNodeId = await GraphService.upsertNode(
      userId,
      "COMPANY" as GraphNodeKind,
      neg.companyName,
      {
        name: neg.companyName,
        domain: null,
        industry: null,
        tier: null,
        hiringStatus: "unknown",
        trustScore: 0.5,
      },
      { weight: 0.6, confidence: 0.6 }
    );

    await GraphService.upsertEdge(userId, offerNodeId, companyNodeId, "OFFERED_BY" as GraphEdgeKind, { weight: 0.95 });
  }
}

// ─── CareerProfile → Goal + Salary nodes ─────────────────────────────────────

async function buildFromCareerProfile(userId: string): Promise<void> {
  const profile = await prisma.careerProfile.findUnique({ where: { userId } });
  if (!profile) return;

  // Career Goals
  let goalsArray: Array<Record<string, any>> = [];
  if (Array.isArray(profile.goals)) {
    goalsArray = profile.goals as Array<Record<string, any>>;
  } else if (profile.goals && typeof profile.goals === "object") {
    const g = profile.goals as Record<string, any>;
    if (g.targetRoles && Array.isArray(g.targetRoles)) {
      goalsArray = g.targetRoles.map(role => ({
        targetRole: role,
        targetCompany: Array.isArray(g.targetCompanies) && g.targetCompanies.length > 0 ? g.targetCompanies[0] : (g.targetCompany ?? null),
        timeline: g.timeline ?? null,
        priority: 0.8,
      }));
    } else {
      goalsArray = [g];
    }
  }

  for (const goal of goalsArray) {
    const targetRole = (goal.targetRole as string) ?? "";
    await GraphService.upsertNode(
      userId,
      "CAREER_GOAL" as GraphNodeKind,
      (goal.title as string) ?? `Goal: ${targetRole}`,
      {
        targetRole,
        targetCompany: (goal.targetCompany as string) ?? null,
        targetIndustry: (goal.targetIndustry as string) ?? null,
        timeline: (goal.timeline as string) ?? null,
        priority: (goal.priority as number) ?? 0.5,
        status: "active",
      },
      { weight: 0.85, confidence: 0.9, sourceEntityId: profile.id, sourceEntityType: "CareerProfile" }
    );
  }

  // Salary target
  const salary = profile.salaryExpectation as Record<string, unknown>;
  if (salary) {
    await GraphService.upsertNode(
      userId,
      "SALARY_TARGET" as GraphNodeKind,
      `Salary Target: ${salary.currency ?? "INR"} ${salary.targetBase ?? 0}`,
      {
        targetBase: (salary.targetBase as number) ?? 0,
        targetTotal: (salary.targetTotal as number) ?? 0,
        currency: (salary.currency as string) ?? "INR",
        timeline: (salary.timeline as string) ?? null,
        marketMin: (salary.marketMin as number) ?? null,
        marketMax: (salary.marketMax as number) ?? null,
        marketMedian: (salary.marketMedian as number) ?? null,
      },
      { weight: 0.8, confidence: 0.85, sourceEntityId: profile.id, sourceEntityType: "CareerProfile" }
    );
  }
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────

export class GraphBuilderService {
  /**
   * React to a platform event and update the Career Graph accordingly.
   * Always recomputes meta after mutations.
   */
  static async handleTrigger(userId: string, trigger: GraphUpdateTrigger): Promise<void> {
    try {
      switch (trigger.type) {
        case "RESUME_UPLOADED":
        case "RESUME_EDITED":
          await buildFromResume(userId, trigger.payload.resumeId);
          break;
        case "JOB_SAVED":
          // Handled implicitly when JOB_APPLIED fires; saved jobs update match nodes
          break;
        case "JOB_APPLIED":
          await buildFromApplication(userId, trigger.payload.applicationId);
          break;
        case "INTERVIEW_COMPLETED":
          await buildFromInterview(userId, trigger.payload.sessionId, trigger.payload.outcome);
          break;
        case "SKILL_ADDED":
          await GraphService.upsertNode(
            userId,
            "SKILL" as GraphNodeKind,
            trigger.payload.skill,
            {
              name: trigger.payload.skill,
              category: "general",
              proficiencyLevel: 0.5,
              yearsOfExperience: 0,
              lastUsed: new Date().toISOString(),
              marketDemand: 0.5,
              isVerified: false,
              sources: [trigger.payload.source],
            },
            { weight: 0.7, confidence: 0.85 }
          );
          break;
        case "CERTIFICATION_ADDED":
          await GraphService.upsertNode(
            userId,
            "CERTIFICATION" as GraphNodeKind,
            trigger.payload.certificationData.name,
            trigger.payload.certificationData,
            { weight: 0.8, confidence: 0.95 }
          );
          break;
        case "OFFER_RECEIVED":
          await GraphService.upsertNode(
            userId,
            "OFFER" as GraphNodeKind,
            `Offer: ${trigger.payload.offerData.role} @ ${trigger.payload.offerData.company}`,
            trigger.payload.offerData,
            { weight: 0.95, confidence: 0.95 }
          );
          break;
      }
    } catch (err) {
      logger.error({ userId, trigger, err }, "[GraphBuilderService] handleTrigger failed");
    } finally {
      await GraphService.recomputeMeta(userId);
    }
  }

  /**
   * Full graph rebuild from all available data sources.
   * Used on initial signup, on-demand refresh, or after a major data import.
   */
  static async fullRebuild(userId: string): Promise<void> {
    logger.info({ userId }, "[GraphBuilderService] Starting full graph rebuild");

    // Get most recent resume
    const latestResume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    if (latestResume) {
      await buildFromResume(userId, latestResume.id);
    }

    // All applications
    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    for (const app of applications) {
      await buildFromApplication(userId, app.id);
    }

    // Completed interview sessions
    const sessions = await prisma.interviewMockSession.findMany({
      where: { userId, status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    for (const s of sessions) {
      await buildFromInterview(userId, s.id, "completed");
    }

    await buildFromSkillGaps(userId);
    await buildFromOffers(userId);
    await buildFromCareerProfile(userId);
    await GraphService.recomputeMeta(userId);

    logger.info({ userId }, "[GraphBuilderService] Full graph rebuild complete");
  }
}
