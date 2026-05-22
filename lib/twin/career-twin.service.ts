import "server-only";
import {
  PredictionType,
  Prisma,
  TwinAutonomyMode,
  TwinInsightCategory,
  TwinMemoryType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { memoryService } from "@/lib/services/memory.service";
import { writeAuditEvent } from "@/lib/domain/audit/audit.service";
import { OrchestrationEventBus } from "@/lib/orchestration/events";

type JsonRecord = Record<string, unknown>;

type ResumeSnapshot = {
  title: string;
  role: string | null;
  summary: string | null;
  skills: string[];
  companies: string[];
  yearsExperience: number;
};

type TwinSourceContext = {
  profile: {
    headline: string | null;
    summary: string | null;
    goals: JsonRecord;
    preferences: JsonRecord;
    salaryExpectation: JsonRecord | null;
    autonomyPolicy: JsonRecord;
  } | null;
  resume: ResumeSnapshot | null;
  applications: {
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  };
  jobs: {
    saved: number;
    averageMatch: number;
    ghostRisk: number;
    scamRisk: number;
    indiaCount: number;
  };
  wellbeing: {
    mood: number | null;
    moodLabel: string | null;
    recentNotes: string[];
  };
  negotiation: {
    sessions: number;
    averageLift: number;
    currency: string;
  };
  learning: {
    activeGaps: string[];
    completedSkills: string[];
  };
};

type PredictionDraft = {
  predictionType: PredictionType;
  subjectType: string;
  subjectId?: string;
  score: number;
  confidence: number;
  explanation: string;
  evidence: JsonRecord[];
  actions: JsonRecord[];
};

type InsightDraft = {
  category: TwinInsightCategory;
  title: string;
  insight: string;
  evidence: JsonRecord[];
  actions: JsonRecord[];
  confidence: number;
  impactScore: number;
};

type SimulationInput = {
  question: string;
  targetRole?: string | undefined;
  targetSkill?: string | undefined;
  horizonMonths?: number | undefined;
};

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function pct(value: number) {
  return Math.round(clamp(value) * 100);
}

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    const found = stringFrom(value);
    if (found) return found;
  }
  return null;
}

function inferResumeSnapshot(resume: { title: string; data: Prisma.JsonValue } | null): ResumeSnapshot | null {
  if (!resume || !resume.data || typeof resume.data !== "object" || Array.isArray(resume.data)) return null;

  const data = resume.data as JsonRecord;
  const personal = asRecord(data.personal as Prisma.JsonValue);
  const experience = Array.isArray(data.experience) ? data.experience as JsonRecord[] : [];
  const latest = experience[0] ?? {};
  const role = pickFirstString(latest.role, latest.title, personal.headline, resume.title);
  const summary = pickFirstString(personal.summary, data.summary);
  const skills = [
    ...asStringArray(data.skills),
    ...asStringArray(data.technicalSkills),
    ...asStringArray(data.tools),
  ].slice(0, 30);
  const companies = experience
    .map((entry) => pickFirstString(entry.company, entry.organization))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 8);

  return {
    title: resume.title,
    role,
    summary,
    skills: Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean))),
    companies,
    yearsExperience: Math.min(20, Math.max(0, experience.length * 1.4)),
  };
}

function inferSeniority(years: number, role: string | null) {
  const normalized = (role ?? "").toLowerCase();
  if (normalized.includes("principal") || normalized.includes("staff")) return "staff";
  if (normalized.includes("lead") || normalized.includes("manager")) return "lead";
  if (normalized.includes("senior") || years >= 5) return "senior";
  if (years >= 2) return "mid";
  return "early";
}

function inferSpecialization(skills: string[], role: string | null) {
  const text = `${role ?? ""} ${skills.join(" ")}`.toLowerCase();
  if (/(genai|llm|ai|ml|machine learning|rag)/.test(text)) return "AI engineering";
  if (/(react|next|frontend|ui|tailwind)/.test(text)) return "frontend product engineering";
  if (/(node|java|spring|backend|api|postgres|redis)/.test(text)) return "backend engineering";
  if (/(data|analytics|sql|warehouse)/.test(text)) return "data engineering";
  if (/(devops|kubernetes|aws|cloud)/.test(text)) return "platform engineering";
  return "software engineering";
}

function roleSuggestions(role: string | null, skills: string[]) {
  const specialization = inferSpecialization(skills, role);
  const base = role?.replace(/^senior\s+/i, "") ?? "software engineer";
  const suggestions = [
    { role: `Senior ${base}`, fit: 0.78, reason: "Closest continuation from current evidence." },
    { role: specialization === "AI engineering" ? "AI Product Engineer" : "Backend Platform Engineer", fit: 0.72, reason: "High market pull and compatible skill adjacency." },
    { role: "Technical Lead", fit: 0.64, reason: "Good upside if leadership and ownership signals keep compounding." },
  ];
  return suggestions;
}

function salaryProjection(role: string | null, seniority: string, skills: string[], applications: TwinSourceContext["applications"]) {
  const specialization = inferSpecialization(skills, role);
  const baseBySeniority: Record<string, number> = {
    early: 8,
    mid: 18,
    senior: 34,
    lead: 48,
    staff: 65,
  };
  const multiplier =
    specialization === "AI engineering" ? 1.28 :
    specialization === "backend engineering" ? 1.15 :
    specialization === "platform engineering" ? 1.18 :
    1.05;
  const searchSignal = applications.interviewRate > 0.18 ? 1.12 : applications.total > 8 && applications.interviews === 0 ? 0.92 : 1;
  const current = Math.round((baseBySeniority[seniority] ?? 18) * multiplier * searchSignal);
  return {
    currency: "INR",
    unit: "LPA",
    currentMarket: { p25: Math.round(current * 0.72), p50: current, p75: Math.round(current * 1.42) },
    sixMonthUpside: Math.round(current * (specialization === "AI engineering" ? 1.32 : 1.18)),
    twoYearUpside: Math.round(current * (seniority === "early" ? 2.2 : 1.65)),
    levers: ["proof-of-work portfolio", "referral density", "interview conversion", "competing offer leverage"],
  };
}

function buildIdentity(context: TwinSourceContext) {
  const role = context.resume?.role ?? context.profile?.headline ?? "Career builder";
  const skills = context.resume?.skills ?? [];
  const seniority = inferSeniority(context.resume?.yearsExperience ?? 0, role);
  const specialization = inferSpecialization(skills, role);
  const ambition = context.applications.total > 10 || context.profile?.goals ? "active growth" : "calibrating";

  return {
    role,
    specialization,
    seniority,
    industryAlignment: specialization.includes("AI") ? "AI-native software" : "software/product engineering",
    technicalDepth: pct(Math.min(0.92, 0.35 + skills.length / 35 + (context.resume?.yearsExperience ?? 0) / 25)),
    leadershipProfile: seniority === "lead" || seniority === "staff" ? "emerging-to-strong" : "individual contributor",
    executionProfile: context.applications.total > 0 ? "shipping through active search loops" : "needs more search telemetry",
    ambitionLevel: ambition,
  };
}

function buildCognitiveProfile(context: TwinSourceContext) {
  const skills = context.resume?.skills ?? [];
  const systems = skills.some((skill) => /system|architecture|postgres|redis|distributed|cloud/i.test(skill));
  const ai = skills.some((skill) => /ai|ml|llm|rag|genai/i.test(skill));
  return {
    learningMode: context.learning.activeGaps.length > 3 ? "structured deep learner" : "fast iterative learner",
    orientation: systems ? "systems thinker" : "execution-oriented builder",
    technicalVsManagerial: context.resume?.role?.toLowerCase().includes("manager") ? "managerial-leaning" : "technical-leaning",
    riskTolerance: context.jobs.saved > 15 || ai ? "medium-high" : "medium",
    compensationMotivation: context.negotiation.sessions > 0 ? "explicit" : "latent",
    startupVsEnterpriseAffinity: ai || context.jobs.indiaCount > 0 ? "startup-to-scaleup friendly" : "enterprise compatible",
  };
}

function buildScores(context: TwinSourceContext) {
  const skillScore = clamp((context.resume?.skills.length ?? 0) / 24);
  const applicationSignal = clamp(context.applications.total / 25);
  const interviewSignal = clamp(context.applications.interviewRate * 2.4);
  const wellbeing = context.wellbeing.mood ? clamp(context.wellbeing.mood / 5) : 0.58;

  return {
    identityCompleteness: pct(clamp(0.25 + skillScore * 0.35 + Number(Boolean(context.resume?.summary)) * 0.2 + applicationSignal * 0.2)),
    marketReadiness: pct(clamp(0.35 + skillScore * 0.3 + interviewSignal * 0.25 + context.jobs.averageMatch / 300)),
    executionConsistency: pct(clamp(0.3 + applicationSignal * 0.45 + Number(context.applications.total > 0) * 0.15)),
    recruiterResonance: pct(clamp(0.35 + context.applications.responseRate * 1.7 + context.applications.offerRate * 0.8)),
    wellbeingResilience: pct(wellbeing),
    negotiationLeverage: pct(clamp(0.28 + context.negotiation.sessions * 0.14 + context.applications.offers * 0.18)),
  };
}

function buildInsights(context: TwinSourceContext): InsightDraft[] {
  const identity = buildIdentity(context);
  const scores = buildScores(context);
  const gaps = context.learning.activeGaps.slice(0, 4);
  const highGhostRisk = context.jobs.ghostRisk > 0.35;

  return [
    {
      category: "identity",
      title: "Professional identity is now anchored",
      insight: `The Twin sees you as a ${identity.seniority} ${identity.specialization} profile with ${identity.executionProfile}.`,
      evidence: [{ source: "resume", role: identity.role }, { source: "skills", count: context.resume?.skills.length ?? 0 }],
      actions: [{ label: "Sharpen positioning", href: "/builder" }, { label: "Find aligned roles", href: "/matches" }],
      confidence: 0.72,
      impactScore: 0.84,
    },
    {
      category: "market",
      title: "Market readiness has a clear next lever",
      insight: scores.marketReadiness >= 70
        ? "Your profile is credible enough to prioritize higher-quality applications and warm referrals."
        : "Your market signal will improve fastest by adding proof-heavy bullets and targeting roles adjacent to your strongest skills.",
      evidence: [{ source: "applications", responseRate: context.applications.responseRate }, { source: "jobs", averageMatch: context.jobs.averageMatch }],
      actions: [{ label: "Run ATS optimizer", href: "/ats" }, { label: "Build referral path", href: "/matches" }],
      confidence: 0.68,
      impactScore: 0.78,
    },
    {
      category: "wellbeing",
      title: "Search momentum should be paced, not forced",
      insight: context.applications.rejected > context.applications.interviews * 2
        ? "Rejection volume is high enough that pacing and feedback loops matter more than sending more applications today."
        : "Momentum looks sustainable. Keep the loop small: apply, learn, adapt, repeat.",
      evidence: [{ source: "applications", rejected: context.applications.rejected, interviews: context.applications.interviews }],
      actions: [{ label: "Check wellbeing", href: "/coach" }],
      confidence: 0.63,
      impactScore: 0.71,
    },
    {
      category: "india_market",
      title: "India-market strategy needs referral density",
      insight: "For India roles, the Twin prioritizes referral paths, DSA calibration, CTC decoding, and hiring-window timing over raw application volume.",
      evidence: [{ source: "india_jobs", count: context.jobs.indiaCount }, { source: "gaps", skills: gaps }],
      actions: [{ label: "Open FAANG India track", href: "/india-track" }, { label: "Decode CTC", href: "/ctc-decoder" }],
      confidence: 0.7,
      impactScore: 0.82,
    },
    ...(highGhostRisk ? [{
      category: "safety" as TwinInsightCategory,
      title: "Ghost-job filtering is active",
      insight: "Some saved roles show elevated ghosting risk. The Twin will down-rank stale posts and prioritize verified hiring signals.",
      evidence: [{ source: "job_intelligence", ghostRisk: context.jobs.ghostRisk }],
      actions: [{ label: "Review job intelligence", href: "/job-intelligence" }],
      confidence: 0.66,
      impactScore: 0.73,
    }] : []),
  ];
}

function buildPredictions(context: TwinSourceContext): PredictionDraft[] {
  const skillSignal = clamp((context.resume?.skills.length ?? 0) / 20);
  const responseHistory = context.applications.responseRate || 0.08;
  const matchSignal = clamp(context.jobs.averageMatch / 100);
  const callback = clamp(0.12 + skillSignal * 0.22 + matchSignal * 0.22 + responseHistory * 0.8);
  const interview = clamp(callback * 0.72 + context.applications.interviewRate * 0.8);
  const offer = clamp(interview * 0.34 + context.applications.offerRate * 1.1);
  const burnout = clamp(0.18 + (context.applications.rejected / Math.max(context.applications.total, 1)) * 0.34 + (context.wellbeing.mood ? (5 - context.wellbeing.mood) / 10 : 0.08));

  return [
    {
      predictionType: "callback_probability",
      subjectType: "search",
      score: callback,
      confidence: 0.66,
      explanation: "Estimated from resume signal density, current job match quality, and historical recruiter response.",
      evidence: [{ skills: context.resume?.skills.length ?? 0 }, { responseRate: context.applications.responseRate }],
      actions: [{ label: "Increase callback probability", steps: ["Add measurable impact bullets", "Prefer fresh verified jobs", "Use referrals before cold apply"] }],
    },
    {
      predictionType: "interview_probability",
      subjectType: "search",
      score: interview,
      confidence: 0.62,
      explanation: "Interview probability follows callback probability but is adjusted by previous interview conversion.",
      evidence: [{ interviews: context.applications.interviews }, { totalApplications: context.applications.total }],
      actions: [{ label: "Improve conversion", steps: ["Tailor top third of resume", "Send role-specific outreach", "Prepare company brief"] }],
    },
    {
      predictionType: "offer_probability",
      subjectType: "search",
      score: offer,
      confidence: 0.58,
      explanation: "Offer probability remains conservative until the Twin observes interview-stage feedback and recruiter velocity.",
      evidence: [{ offers: context.applications.offers }, { interviewRate: context.applications.interviewRate }],
      actions: [{ label: "Raise offer odds", steps: ["Run interview prep", "Track rejection reasons", "Use proof projects in answers"] }],
    },
    {
      predictionType: "burnout_risk",
      subjectType: "wellbeing",
      score: burnout,
      confidence: 0.61,
      explanation: "Burnout risk combines rejection ratio, recent mood, and application load.",
      evidence: [{ rejected: context.applications.rejected }, { mood: context.wellbeing.mood }],
      actions: [{ label: "Protect energy", steps: ["Cap low-quality applications", "Batch outreach", "Celebrate evidence of progress"] }],
    },
    {
      predictionType: "ghosting_risk",
      subjectType: "job_market",
      score: context.jobs.ghostRisk,
      confidence: 0.64,
      explanation: "Ghosting risk is inherited from saved job intelligence and stale/low-signal posting patterns.",
      evidence: [{ savedJobs: context.jobs.saved }, { ghostRisk: context.jobs.ghostRisk }],
      actions: [{ label: "Reduce ghosting", steps: ["Prioritize recently verified roles", "Find hiring manager signals", "Use follow-up sequences"] }],
    },
    {
      predictionType: "skill_stagnation_risk",
      subjectType: "learning",
      score: clamp(context.learning.activeGaps.length / 8),
      confidence: 0.59,
      explanation: "Skill stagnation risk rises when several target-role gaps are open without completed learning signals.",
      evidence: [{ gaps: context.learning.activeGaps }, { completed: context.learning.completedSkills }],
      actions: [{ label: "Close the highest ROI gap", steps: ["Pick one marketable skill", "Ship one public proof artifact", "Re-score after two weeks"] }],
    },
  ];
}

async function loadContext(userId: string): Promise<TwinSourceContext> {
  const [
    profile,
    resume,
    applicationRows,
    jobRows,
    latestWellbeing,
    wellbeingRows,
    negotiations,
    skillGaps,
  ] = await Promise.all([
    prisma.careerProfile.findUnique({
      where: { userId },
      select: { headline: true, summary: true, goals: true, preferences: true, salaryExpectation: true, autonomyPolicy: true },
    }),
    prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { title: true, data: true },
    }),
    prisma.application.findMany({
      where: { userId },
      select: { status: true, updatedAt: true },
    }),
    prisma.jobOpportunity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { matchScore: true, ghostScore: true, scamScore: true, parsed: true },
    }),
    prisma.wellbeingCheckIn.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { mood: true, moodLabel: true },
    }),
    prisma.wellbeingCheckIn.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { note: true },
    }),
    prisma.negotiationSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { offerBase: true, finalOffer: true, currency: true },
    }),
    prisma.skillGapAnalysis.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { gapSkills: true, completedSkills: true },
    }),
  ]);

  const total = applicationRows.length;
  const applied = applicationRows.filter((row) => row.status === "applied").length;
  const interviews = applicationRows.filter((row) => row.status === "interview").length;
  const offers = applicationRows.filter((row) => row.status === "offer").length;
  const rejected = applicationRows.filter((row) => row.status === "rejected").length;
  const responses = interviews + offers + rejected;
  const matchScores = jobRows.map((row) => row.matchScore).filter((score) => score > 0);
  const indiaCount = jobRows.filter((row) => asRecord(row.parsed).isIndia === true).length;
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const lifts = negotiations
    .filter((row) => row.finalOffer && row.offerBase)
    .map((row) => ((row.finalOffer ?? row.offerBase) - row.offerBase) / Math.max(row.offerBase, 1));
  const activeGapNames = skillGaps.flatMap((gap) => {
    if (!Array.isArray(gap.gapSkills)) return [];
    return gap.gapSkills
      .map((entry) => typeof entry === "string" ? entry : stringFrom(asRecord(entry as Prisma.JsonValue).skill))
      .filter((entry): entry is string => Boolean(entry));
  });

  return {
    profile: profile ? {
      headline: profile.headline,
      summary: profile.summary,
      goals: asRecord(profile.goals),
      preferences: asRecord(profile.preferences),
      salaryExpectation: profile.salaryExpectation ? asRecord(profile.salaryExpectation) : null,
      autonomyPolicy: asRecord(profile.autonomyPolicy),
    } : null,
    resume: inferResumeSnapshot(resume),
    applications: {
      total,
      applied,
      interviews,
      offers,
      rejected,
      responseRate: total ? responses / total : 0,
      interviewRate: total ? interviews / total : 0,
      offerRate: total ? offers / total : 0,
    },
    jobs: {
      saved: jobRows.length,
      averageMatch: average(matchScores),
      ghostRisk: average(jobRows.map((row) => row.ghostScore ?? 0)),
      scamRisk: average(jobRows.map((row) => row.scamScore ?? 0)),
      indiaCount,
    },
    wellbeing: {
      mood: latestWellbeing?.mood ?? null,
      moodLabel: latestWellbeing?.moodLabel ?? null,
      recentNotes: wellbeingRows.map((row) => row.note).filter((note): note is string => Boolean(note)),
    },
    negotiation: {
      sessions: negotiations.length,
      averageLift: average(lifts),
      currency: negotiations[0]?.currency ?? "INR",
    },
    learning: {
      activeGaps: Array.from(new Set(activeGapNames)).slice(0, 12),
      completedSkills: Array.from(new Set(skillGaps.flatMap((gap) => gap.completedSkills))).slice(0, 12),
    },
  };
}

async function seedTwinMemories(twinId: string, userId: string, context: TwinSourceContext) {
  const memories: Array<{ type: TwinMemoryType; title: string; content: string; importance: number; confidence: number; source: string; metadata?: JsonRecord }> = [];
  if (context.resume?.summary) {
    memories.push({
      type: "resume",
      title: "Professional narrative",
      content: context.resume.summary,
      importance: 0.9,
      confidence: 0.86,
      source: "resume",
      metadata: { role: context.resume.role, skills: context.resume.skills.slice(0, 12) },
    });
  }
  for (const skill of context.resume?.skills.slice(0, 12) ?? []) {
    memories.push({
      type: "skill",
      title: skill,
      content: `${skill} appears in the user's current professional evidence.`,
      importance: 0.6,
      confidence: 0.78,
      source: "resume",
    });
  }
  if (context.applications.total > 0) {
    memories.push({
      type: "application",
      title: "Application conversion pattern",
      content: `Applications: ${context.applications.total}, interviews: ${context.applications.interviews}, offers: ${context.applications.offers}, rejections: ${context.applications.rejected}.`,
      importance: 0.82,
      confidence: 0.8,
      source: "analytics",
      metadata: context.applications,
    });
  }

  for (const memory of memories) {
    const existing = await prisma.twinMemory.findFirst({
      where: { userId, twinId, type: memory.type, title: memory.title },
      select: { id: true, reinforcementCount: true },
    });

    if (existing) {
      await prisma.twinMemory.update({
        where: { id: existing.id },
        data: {
          content: memory.content,
          importance: memory.importance,
          confidence: memory.confidence,
          reinforcementCount: { increment: 1 },
          recencyWeight: 1,
          metadata: json(memory.metadata ?? {}),
        },
      });
      continue;
    }

    const row = await prisma.twinMemory.create({
      data: {
        twinId,
        userId,
        type: memory.type,
        title: memory.title,
        content: memory.content,
        summary: memory.content.slice(0, 360),
        importance: memory.importance,
        confidence: memory.confidence,
        source: memory.source,
        metadata: json(memory.metadata ?? {}),
        decayAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });

    await writeTwinEvent(twinId, userId, "memory_added", `Remembered ${memory.title}`, {
      memoryId: row.id,
      type: memory.type,
    });
  }
}

async function writeTwinEvent(
  twinId: string,
  userId: string,
  type: "created" | "evolved" | "memory_added" | "insight_created" | "prediction_created" | "simulation_created" | "approval_requested" | "action_executed" | "privacy_changed" | "export_requested" | "delete_requested",
  summary: string,
  payload: JsonRecord = {}
) {
  return prisma.twinEvent.create({
    data: {
      twinId,
      userId,
      type,
      summary,
      payload: json(payload),
    },
  });
}

export class CareerTwinService {
  static async getOrCreate(userId: string) {
    if (!prisma.careerTwin) {
      throw new Error(
        "Prisma client missing careerTwin model. Run prisma generate."
      );
    }
    const existing = await prisma.careerTwin.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.evolve(userId, "initial_generation");
  }

  static async getSnapshot(userId: string) {
    await this.getOrCreate(userId);
    return prisma.careerTwin.findUniqueOrThrow({
      where: { userId },
      include: {
        behavioralProfile: true,
        communicationProfile: true,
        memories: {
          orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
          take: 10,
          select: {
            id: true,
            type: true,
            title: true,
            summary: true,
            content: true,
            importance: true,
            confidence: true,
            recencyWeight: true,
            reinforcementCount: true,
            source: true,
            evidenceRefs: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        insights: {
          where: { status: "active" },
          orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
          take: 8,
        },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 8,
        },
        emotionalStates: {
          orderBy: { observedAt: "desc" },
          take: 1,
        },
        learningVelocities: {
          orderBy: [{ estimatedWeeks: "asc" }, { updatedAt: "desc" }],
          take: 6,
        },
        skillGaps: {
          where: { status: "open" },
          orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
          take: 6,
        },
        trajectories: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        simulations: {
          orderBy: { createdAt: "desc" },
          take: 4,
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
    });
  }

  static async evolve(userId: string, reason = "manual_refresh") {
    if (!prisma.careerTwin) {
      throw new Error(
        "Prisma client missing careerTwin model. Run prisma generate."
      );
    }
    const context = await loadContext(userId);
    const identity = buildIdentity(context);
    const cognitive = buildCognitiveProfile(context);
    const scores = buildScores(context);
    const role = context.resume?.role ?? context.profile?.headline ?? "Software Engineer";
    const seniority = inferSeniority(context.resume?.yearsExperience ?? 0, role);
    const salary = salaryProjection(role, seniority, context.resume?.skills ?? [], context.applications);
    const autonomyMode = parseAutonomy(context.profile?.autonomyPolicy?.mode);
    const strengths = inferStrengths(context);
    const weaknesses = inferWeaknesses(context);
    const confidence = clamp(0.38 + Number(Boolean(context.resume)) * 0.22 + Math.min(context.applications.total, 20) / 100 + Math.min(context.jobs.saved, 20) / 140);

    const twin = await prisma.careerTwin.upsert({
      where: { userId },
      create: {
        userId,
        status: "active",
        autonomyMode,
        professionalIdentity: json(identity),
        cognitiveProfile: json(cognitive),
        scores: json(scores),
        confidence,
        strengths,
        weaknesses,
        bestFitRoles: json(roleSuggestions(role, context.resume?.skills ?? [])),
        hiddenOpportunities: json(hiddenOpportunities(context)),
        salaryProjection: json(salary),
        activePlan: json(buildActivePlan(context)),
        privacyControls: json(defaultPrivacyControls()),
        lastEvolvedAt: new Date(),
      },
      update: {
        status: "active",
        autonomyMode,
        professionalIdentity: json(identity),
        cognitiveProfile: json(cognitive),
        scores: json(scores),
        confidence,
        strengths,
        weaknesses,
        bestFitRoles: json(roleSuggestions(role, context.resume?.skills ?? [])),
        hiddenOpportunities: json(hiddenOpportunities(context)),
        salaryProjection: json(salary),
        activePlan: json(buildActivePlan(context)),
        lastEvolvedAt: new Date(),
      },
    });

    await Promise.all([
      this.upsertBehavioralProfile(twin.id, userId, context),
      this.upsertCommunicationProfile(twin.id, userId, context),
      this.refreshInsights(twin.id, userId, context),
      this.refreshPredictions(twin.id, userId, context),
      this.recordTrajectory(twin.id, userId, context),
      this.recordEmotionalState(twin.id, userId, context),
      this.refreshLearning(twin.id, userId, context),
      seedTwinMemories(twin.id, userId, context),
    ]);

    await writeTwinEvent(twin.id, userId, reason === "initial_generation" ? "created" : "evolved", "AI Career Twin evolved from latest career signals.", {
      reason,
      confidence,
      scores,
    });
    await writeAuditEvent({
      userId,
      action: "career_twin.evolved",
      entityType: "CareerTwin",
      entityId: twin.id,
      metadata: { reason, confidence },
    });
    await OrchestrationEventBus.publish(userId, {
      type: "agent.completed",
      source: "career_twin",
      visibility: "user_visible",
      payload: {
        title: "AI Career Twin evolved",
        confidence,
        scores,
      },
    }).catch(() => undefined);

    return twin;
  }

  static async createTwinMemory(userId: string, input: {
    type: TwinMemoryType;
    title: string;
    content: string;
    importance?: number | undefined;
    confidence?: number | undefined;
    source?: string | undefined;
    metadata?: JsonRecord | undefined;
  }) {
    const twin = await this.getOrCreate(userId);
    const row = await prisma.twinMemory.create({
      data: {
        twinId: twin.id,
        userId,
        type: input.type,
        title: input.title,
        content: input.content,
        summary: input.content.slice(0, 360),
        importance: clamp(input.importance ?? 0.62),
        confidence: clamp(input.confidence ?? 0.72),
        source: input.source ?? "user",
        metadata: json(input.metadata ?? {}),
        decayAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    await writeTwinEvent(twin.id, userId, "memory_added", `Remembered ${input.title}`, { memoryId: row.id, type: input.type });
    return row;
  }

  static async searchMemory(userId: string, query: string, limit = 8) {
    const twin = await this.getOrCreate(userId);
    let embedding: number[];
    try {
      embedding = await memoryService.embedText(query);
    } catch {
      return prisma.twinMemory.findMany({
        where: {
          userId,
          twinId: twin.id,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: limit,
      });
    }

    const vectorLiteral = `[${embedding.join(",")}]`;
    return prisma.$queryRaw<Array<{
      id: string;
      type: TwinMemoryType;
      title: string;
      content: string;
      summary: string | null;
      confidence: number;
      importance: number;
      source: string;
      metadata: Prisma.JsonValue;
      createdAt: Date;
      similarity: number;
    }>>`
      SELECT
        id,
        type,
        title,
        content,
        summary,
        confidence,
        importance,
        source,
        metadata,
        "createdAt",
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "TwinMemory"
      WHERE "userId" = ${userId}::uuid
        AND "twinId" = ${twin.id}::uuid
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
  }

  static async predict(userId: string, subject?: { type?: string | undefined; id?: string | undefined }) {
    const context = await loadContext(userId);
    const twin = await this.getOrCreate(userId);
    const predictions = buildPredictions(context).map((prediction) => ({
      ...prediction,
      subjectType: subject?.type ?? prediction.subjectType,
      subjectId: subject?.id ?? prediction.subjectId,
    }));

    await prisma.outcomePrediction.createMany({
      data: predictions.map((prediction) => ({
        twinId: twin.id,
        userId,
        predictionType: prediction.predictionType,
        subjectType: prediction.subjectType,
        subjectId: prediction.subjectId ?? null,
        score: prediction.score,
        confidence: prediction.confidence,
        explanation: prediction.explanation,
        evidence: json(prediction.evidence),
        actions: json(prediction.actions),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })),
    });

    await writeTwinEvent(twin.id, userId, "prediction_created", "Outcome predictions refreshed.", { count: predictions.length });
    return predictions;
  }

  static async simulate(userId: string, input: SimulationInput) {
    const context = await loadContext(userId);
    const twin = await this.getOrCreate(userId);
    const role = input.targetRole ?? context.resume?.role ?? "Software Engineer";
    const horizon = Math.max(3, Math.min(input.horizonMonths ?? 12, 60));
    const skillBoost = input.targetSkill ? 0.14 : 0.07;
    const currentSalary = asRecord(twin.salaryProjection).currentMarket as JsonRecord | undefined;
    const currentP50 = typeof currentSalary?.p50 === "number" ? currentSalary.p50 : 18;
    const upside = Math.round(currentP50 * (1 + skillBoost + horizon / 120));
    const projection = {
      horizonMonths: horizon,
      targetRole: role,
      targetSkill: input.targetSkill ?? null,
      salary: {
        currentP50,
        projectedP50: upside,
        low: Math.round(upside * 0.78),
        high: Math.round(upside * 1.28),
        currency: "INR",
        unit: "LPA",
      },
      roleProgression: [
        { month: 0, role: context.resume?.role ?? "Current role", confidence: 0.75 },
        { month: Math.round(horizon / 2), role: input.targetSkill ? `${input.targetSkill} proof builder` : "Specialized candidate", confidence: 0.62 },
        { month: horizon, role, confidence: 0.55 },
      ],
      companies: ["growth-stage SaaS", "India product companies", "AI-native startups", "global remote teams"],
    };
    const uncertainty = [
      "Actual salary depends on interview performance, city, company tier, and competing offer leverage.",
      "Learning impact compounds only if converted into visible projects or work artifacts.",
    ];
    const recommendation = input.targetSkill
      ? `Learn ${input.targetSkill} with a proof project, then target ${role} roles where that skill is a hiring filter.`
      : `Pursue ${role} only if it increases both compensation leverage and day-to-day energy.`;

    const row = await prisma.careerSimulation.create({
      data: {
        twinId: twin.id,
        userId,
        question: input.question,
        scenario: json({ targetRole: input.targetRole, targetSkill: input.targetSkill, horizonMonths: horizon }),
        baseline: json({ role: context.resume?.role, salaryProjection: twin.salaryProjection }),
        projection: json(projection),
        confidenceIntervals: json({ salaryP50: [projection.salary.low, projection.salary.high], confidence: 0.57 }),
        uncertainty: json(uncertainty),
        recommendation,
        confidence: 0.57,
      },
    });

    await writeTwinEvent(twin.id, userId, "simulation_created", "Career trajectory simulation completed.", { simulationId: row.id });
    return row;
  }

  static async updatePrivacy(userId: string, controls: JsonRecord) {
    const twin = await this.getOrCreate(userId);
    const updated = await prisma.careerTwin.update({
      where: { userId },
      data: { privacyControls: json({ ...asRecord(twin.privacyControls), ...controls }) },
    });
    await writeTwinEvent(twin.id, userId, "privacy_changed", "Twin privacy controls updated.", controls);
    await writeAuditEvent({
      userId,
      action: "career_twin.privacy_updated",
      entityType: "CareerTwin",
      entityId: twin.id,
      metadata: json(controls) as Prisma.InputJsonObject,
    });
    return updated;
  }

  private static async upsertBehavioralProfile(twinId: string, userId: string, context: TwinSourceContext) {
    const consistency = clamp(context.applications.total / 20);
    const rejectionRatio = context.applications.total ? context.applications.rejected / context.applications.total : 0;
    const burnoutRisk = clamp(0.2 + rejectionRatio * 0.35 + (context.wellbeing.mood ? (5 - context.wellbeing.mood) / 12 : 0));
    return prisma.behavioralProfile.upsert({
      where: { userId },
      create: {
        twinId,
        userId,
        applicationConsistency: consistency,
        procrastinationRisk: clamp(0.55 - consistency * 0.35),
        burnoutRisk,
        communicationConfidence: clamp(0.42 + context.applications.responseRate),
        negotiationAggressiveness: clamp(0.38 + context.negotiation.sessions * 0.08),
        learningDiscipline: clamp(0.45 + context.learning.completedSkills.length * 0.06),
        evidence: json([{ applications: context.applications }, { wellbeing: context.wellbeing }]),
        confidence: 0.62,
      },
      update: {
        applicationConsistency: consistency,
        procrastinationRisk: clamp(0.55 - consistency * 0.35),
        burnoutRisk,
        communicationConfidence: clamp(0.42 + context.applications.responseRate),
        negotiationAggressiveness: clamp(0.38 + context.negotiation.sessions * 0.08),
        learningDiscipline: clamp(0.45 + context.learning.completedSkills.length * 0.06),
        evidence: json([{ applications: context.applications }, { wellbeing: context.wellbeing }]),
        confidence: 0.62,
      },
    });
  }

  private static async upsertCommunicationProfile(twinId: string, userId: string, context: TwinSourceContext) {
    const hasSummary = Boolean(context.resume?.summary || context.profile?.summary);
    const clarity = clamp(0.48 + Number(hasSummary) * 0.16 + context.applications.responseRate);
    return prisma.communicationProfile.upsert({
      where: { userId },
      create: {
        twinId,
        userId,
        tone: "calm, specific, evidence-led",
        clarityScore: clarity,
        warmthScore: 0.6,
        brevityScore: context.resume?.summary && context.resume.summary.length < 900 ? 0.68 : 0.52,
        confidenceScore: clamp(0.45 + context.applications.responseRate * 1.2),
        recruiterFit: json({ bestChannels: ["referral", "short recruiter email", "LinkedIn DM"], avoid: ["generic cold apply only"] }),
        writingPatterns: json([{ pattern: "lead with proof", reason: "Improves recruiter scan speed." }]),
        dos: ["Open with role fit evidence", "Use concrete impact", "Ask for a specific next step"],
        donts: ["Over-explain background", "Hide compensation constraints", "Send untailored paragraphs"],
        confidence: 0.61,
      },
      update: {
        tone: "calm, specific, evidence-led",
        clarityScore: clarity,
        warmthScore: 0.6,
        brevityScore: context.resume?.summary && context.resume.summary.length < 900 ? 0.68 : 0.52,
        confidenceScore: clamp(0.45 + context.applications.responseRate * 1.2),
        recruiterFit: json({ bestChannels: ["referral", "short recruiter email", "LinkedIn DM"], avoid: ["generic cold apply only"] }),
        writingPatterns: json([{ pattern: "lead with proof", reason: "Improves recruiter scan speed." }]),
        dos: ["Open with role fit evidence", "Use concrete impact", "Ask for a specific next step"],
        donts: ["Over-explain background", "Hide compensation constraints", "Send untailored paragraphs"],
        confidence: 0.61,
      },
    });
  }

  private static async refreshInsights(twinId: string, userId: string, context: TwinSourceContext) {
    const insights = buildInsights(context);
    await prisma.twinInsight.updateMany({
      where: { twinId, status: "active" },
      data: { status: "superseded" },
    });
    await prisma.twinInsight.createMany({
      data: insights.map((insight) => ({
        twinId,
        userId,
        category: insight.category,
        title: insight.title,
        insight: insight.insight,
        evidence: json(insight.evidence),
        actions: json(insight.actions),
        confidence: insight.confidence,
        impactScore: insight.impactScore,
      })),
    });
    if (insights[0]) {
      await writeTwinEvent(twinId, userId, "insight_created", insights[0].title, { count: insights.length });
    }
  }

  private static async refreshPredictions(twinId: string, userId: string, context: TwinSourceContext) {
    const predictions = buildPredictions(context);
    await prisma.outcomePrediction.createMany({
      data: predictions.map((prediction) => ({
        twinId,
        userId,
        predictionType: prediction.predictionType,
        subjectType: prediction.subjectType,
        subjectId: prediction.subjectId ?? null,
        score: prediction.score,
        confidence: prediction.confidence,
        explanation: prediction.explanation,
        evidence: json(prediction.evidence),
        actions: json(prediction.actions),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })),
    });
    await writeTwinEvent(twinId, userId, "prediction_created", "Outcome predictions refreshed.", { count: predictions.length });
  }

  private static async recordTrajectory(twinId: string, userId: string, context: TwinSourceContext) {
    const role = context.resume?.role ?? "Software Engineer";
    const seniority = inferSeniority(context.resume?.yearsExperience ?? 0, role);
    return prisma.careerTrajectory.create({
      data: {
        twinId,
        userId,
        currentRole: role,
        targetRole: stringFrom(context.profile?.goals?.targetRole) ?? roleSuggestions(role, context.resume?.skills ?? [])[0]?.role ?? null,
        seniority,
        industry: inferSpecialization(context.resume?.skills ?? [], role),
        trajectory: json([
          { horizon: "now", focus: "tighten identity and evidence" },
          { horizon: "90_days", focus: "increase response and interview rate" },
          { horizon: "12_months", focus: "compound specialization and offer leverage" },
        ]),
        salaryTrajectory: json(salaryProjection(role, seniority, context.resume?.skills ?? [], context.applications)),
        risks: json(["thin recruiter feedback", "low referral density", "skill proof not visible enough"]),
        opportunities: json(hiddenOpportunities(context)),
        confidence: 0.58,
      },
    });
  }

  private static async recordEmotionalState(twinId: string, userId: string, context: TwinSourceContext) {
    const mood = context.wellbeing.mood ? clamp(context.wellbeing.mood / 5) : 0.56;
    const rejectionRatio = context.applications.total ? context.applications.rejected / context.applications.total : 0;
    return prisma.emotionalState.create({
      data: {
        twinId,
        userId,
        confidence: clamp(0.48 + context.applications.interviewRate),
        momentum: clamp(0.42 + context.applications.total / 40),
        anxiety: clamp(0.28 + rejectionRatio * 0.22),
        burnout: clamp(0.2 + rejectionRatio * 0.32 + (1 - mood) * 0.18),
        motivation: mood,
        rejectionFatigue: clamp(rejectionRatio * 0.7),
        note: context.wellbeing.moodLabel ? `Latest mood: ${context.wellbeing.moodLabel}` : null,
        intervention: json({
          stance: rejectionRatio > 0.45 ? "recover and refine" : "continue with focused momentum",
          suggestion: rejectionRatio > 0.45 ? "Use fewer, better applications this week." : "Keep the daily loop lightweight and measurable.",
        }),
      },
    });
  }

  private static async refreshLearning(twinId: string, userId: string, context: TwinSourceContext) {
    const targetRole = stringFrom(context.profile?.goals?.targetRole) ?? roleSuggestions(context.resume?.role ?? null, context.resume?.skills ?? [])[0]?.role ?? "Software Engineer";
    const gaps = context.learning.activeGaps.length ? context.learning.activeGaps : defaultGapsFor(context.resume?.skills ?? []);

    for (const [index, skill] of gaps.slice(0, 5).entries()) {
      await prisma.skillGap.upsert({
        where: { userId_targetRole_skill: { userId, targetRole, skill } },
        create: {
          twinId,
          userId,
          targetRole,
          skill,
          currentLevel: 0.25,
          requiredLevel: 0.78,
          marketDemand: clamp(0.82 - index * 0.06),
          priority: clamp(0.86 - index * 0.08),
          learningPlan: json([
            `Study ${skill} fundamentals`,
            `Ship one proof artifact using ${skill}`,
            "Attach proof to resume and outreach",
          ]),
        },
        update: {
          marketDemand: clamp(0.82 - index * 0.06),
          priority: clamp(0.86 - index * 0.08),
          learningPlan: json([
            `Study ${skill} fundamentals`,
            `Ship one proof artifact using ${skill}`,
            "Attach proof to resume and outreach",
          ]),
        },
      });

      await prisma.learningVelocity.upsert({
        where: { userId_skill: { userId, skill } },
        create: {
          twinId,
          userId,
          skill,
          currentLevel: 0.25,
          targetLevel: 0.78,
          weeklyProgress: context.learning.completedSkills.includes(skill) ? 0.18 : 0.05,
          estimatedWeeks: 4 + index * 2,
          learningStyle: "proof-project",
          evidence: json([{ source: "skill_gap", targetRole }]),
        },
        update: {
          weeklyProgress: context.learning.completedSkills.includes(skill) ? 0.18 : 0.05,
          estimatedWeeks: 4 + index * 2,
          evidence: json([{ source: "skill_gap", targetRole }]),
          lastMeasuredAt: new Date(),
        },
      });
    }
  }
}

function parseAutonomy(value: unknown): TwinAutonomyMode {
  if (value === "assisted" || value === "autonomous" || value === "manual") return value;
  return "manual";
}

function defaultPrivacyControls() {
  return {
    memoryEnabled: true,
    aiTrainingAllowed: false,
    sensitiveFieldsRequireApproval: true,
    executionReplayEnabled: true,
    retention: {
      rawEventsDays: 730,
      workflowEventsDays: 365,
      screenshotsDays: 30,
    },
  };
}

function inferStrengths(context: TwinSourceContext) {
  const skills = context.resume?.skills ?? [];
  const strengths = [
    skills.length >= 8 ? "Broad skill surface with enough evidence to personalize applications" : undefined,
    context.applications.interviews > 0 ? "Has proven interview conversion signal" : undefined,
    context.negotiation.sessions > 0 ? "Has explicit compensation negotiation data" : undefined,
    context.jobs.indiaCount > 0 ? "India-market targeting signal is available" : undefined,
    context.resume?.summary ? "Narrative foundation exists for recruiter-facing positioning" : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  return strengths.length ? strengths.slice(0, 5) : ["Early identity signal captured; upload richer career evidence to strengthen the Twin"];
}

function inferWeaknesses(context: TwinSourceContext) {
  const weaknesses = [
    !context.resume?.summary ? "Professional narrative is under-specified" : undefined,
    (context.resume?.skills.length ?? 0) < 6 ? "Skill evidence is thin for high-confidence matching" : undefined,
    context.applications.total > 8 && context.applications.interviews === 0 ? "Application volume is not converting to interviews yet" : undefined,
    context.jobs.saved === 0 ? "Market preference data is missing" : undefined,
    context.learning.activeGaps.length > 4 ? "Learning focus may be spread across too many gaps" : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  return weaknesses.length ? weaknesses.slice(0, 5) : ["No severe weakness detected; next gains come from sharper targeting"];
}

function hiddenOpportunities(context: TwinSourceContext) {
  const skills = context.resume?.skills ?? [];
  const specialization = inferSpecialization(skills, context.resume?.role ?? null);
  return [
    {
      title: specialization === "AI engineering" ? "AI product engineering roles" : "Internal-tools and platform roles",
      reason: "Your current evidence can be reframed toward higher-demand problem spaces.",
      confidence: 0.66,
    },
    {
      title: "Referral-first applications",
      reason: "India and competitive product roles reward warm paths more than raw application volume.",
      confidence: 0.72,
    },
    {
      title: "Proof-led LinkedIn positioning",
      reason: "A visible project summary can raise recruiter response without changing core experience.",
      confidence: 0.61,
    },
  ];
}

function buildActivePlan(context: TwinSourceContext) {
  return {
    primaryCTA: context.applications.total === 0 ? "Start with 5 high-fit applications" : "Improve the next 10% of applications",
    weeklyOperatingLoop: [
      "Refresh memory from latest resume/application events",
      "Rank roles by fit, freshness, ghosting risk, and referral path",
      "Create tailored application packet",
      "Ask for approval before any external action",
      "Update predictions from recruiter response",
    ],
    autonomyGuardrails: [
      "Never submit applications without user approval unless autonomous mode is enabled",
      "Never share salary expectations without explicit approval",
      "Store reasoning, data sources, and confidence with every action",
    ],
  };
}

function defaultGapsFor(skills: string[]) {
  const text = skills.join(" ").toLowerCase();
  if (!/system design/.test(text)) return ["System design", "Role-specific DSA", "Recruiter outreach"];
  if (!/ai|llm|genai/.test(text)) return ["GenAI application patterns", "Portfolio proof", "Referral networking"];
  return ["Interview storytelling", "Compensation negotiation", "Market-specific positioning"];
}
