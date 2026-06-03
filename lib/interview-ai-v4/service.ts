import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeText, slugify } from "@/lib/interview-intelligence/utils";

const STOP_WORDS = new Set([
  "about", "above", "after", "also", "and", "are", "been", "but", "can", "for", "from", "have",
  "into", "job", "our", "role", "that", "the", "this", "with", "will", "work", "you", "your",
  "years", "team", "teams", "must", "good", "plus", "preferred", "required", "responsibilities",
]);

const SKILL_ALIASES = [
  "javascript", "typescript", "react", "next.js", "nextjs", "node.js", "nodejs", "express",
  "java", "spring", "python", "django", "go", "golang", "c++", "kotlin", "swift",
  "postgresql", "postgres", "mysql", "mongodb", "redis", "kafka", "rabbitmq", "elasticsearch",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "graphql", "rest", "grpc",
  "microservices", "system design", "low level design", "machine coding", "dsa", "algorithms",
  "data structures", "sql", "nosql", "distributed systems", "idempotency", "observability",
  "ci/cd", "security", "payments", "fintech", "reconciliation", "websockets", "etl", "ml", "ai",
];

export type HiringSetup = {
  companyName: string;
  roleTitle: string;
  experienceLevel: string;
  targetLocation?: string;
  compensationTarget?: string;
};

export type ResumeProfile = {
  source: string;
  rawText: string;
  summary: string | null;
  skills: string[];
  experienceSignals: string[];
  senioritySignals: string[];
  projectSignals: string[];
};

export type JobDescriptionProfile = {
  source: string;
  rawText: string;
  skills: string[];
  requirements: string[];
  responsibilities: string[];
  signals: string[];
  keywords: string[];
  seniority: string | null;
};

export type ReadinessComponent = {
  key: string;
  label: string;
  score: number | null;
  explanation: string;
};

export type InterviewBlueprintRound = {
  roundNumber: number;
  name: string;
  type: string;
  durationMinutes: number;
  focusAreas: string[];
  expectedSignals: string[];
};

export type InterviewBlueprint = {
  source: "ai_enriched" | "role_jd_inferred";
  difficultyScore: number;
  confidence: number;
  rounds: InterviewBlueprintRound[];
  focusAreas: string[];
  behavioralFocusAreas: string[];
  communicationExpectations: string[];
  expectedHiringTimeline: string | null;
};

export type IntelligenceProfile = {
  sessionId: string;
  companyProfile: {
    name: string;
    slug: string;
    industry: string | null;
    tier: string | null;
    evidence: string[];
  };
  roleProfile: {
    title: string;
    experienceLevel: string;
    targetLocation: string | null;
    seniority: string | null;
    keyTechnicalAreas: string[];
  };
  salaryRange: null | {
    currency: string;
    min: number | null;
    median: number | null;
    max: number | null;
    confidence: number;
    source: string;
  };
  readiness: {
    overallScore: number;
    status: "provisional" | "mock_calibrated";
    components: ReadinessComponent[];
    formula: string;
    missingInputs: string[];
  };
  blueprint: InterviewBlueprint;
  preparationPriorities: string[];
  roadmap: {
    sevenDayPlan: string[];
    fourteenDayPlan: string[];
    thirtyDayPlan: string[];
    ninetyDayPlan: string[];
  };
  analytics: {
    readinessTrend: Array<{ date: string; score: number }>;
    mockTrend: Array<{ date: string; score: number }>;
    communicationTrend: Array<{ date: string; score: number }>;
  };
};

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function words(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function topKeywords(text: string, limit = 18) {
  const counts = new Map<string, number>();
  for (const word of words(text)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function extractSkills(text: string) {
  const normalized = normalizeText(text);
  const matched = SKILL_ALIASES.filter((skill) => normalized.includes(normalizeText(skill)));
  return unique(matched.map((skill) => (skill === "nextjs" ? "Next.js" : skill === "nodejs" ? "Node.js" : skill)));
}

function extractLines(text: string, pattern: RegExp, limit: number) {
  return text
    .split(/\n|\. /)
    .map((line) => line.trim())
    .filter((line) => line.length >= 18 && pattern.test(line.toLowerCase()))
    .slice(0, limit);
}

function overlapScore(source: string[], target: string[]) {
  if (target.length === 0) return null;
  const sourceSet = new Set(source.map((item) => normalizeText(item)));
  const hits = target.filter((item) => sourceSet.has(normalizeText(item))).length;
  return Math.round((hits / target.length) * 100);
}

function keywordCoverageScore(resumeText: string, jdKeywords: string[]) {
  if (jdKeywords.length === 0) return null;
  const normalizedResume = normalizeText(resumeText);
  const hits = jdKeywords.filter((keyword) => normalizedResume.includes(keyword)).length;
  return Math.round((hits / jdKeywords.length) * 100);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function inferSeniority(roleTitle: string, jdText: string) {
  const value = normalizeText(`${roleTitle} ${jdText}`);
  if (/principal|staff|architect|sde\s*4/.test(value)) return "staff_plus";
  if (/lead|manager|sde\s*3/.test(value)) return "lead";
  if (/senior|sde\s*2|ii\b|4\+|5\+|6\+/.test(value)) return "senior";
  if (/fresher|graduate|entry|sde\s*1|0-2|1\+/.test(value)) return "entry";
  return null;
}

function componentAverage(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => typeof value === "number");
  if (present.length === 0) return null;
  return clampScore(present.reduce((sum, value) => sum + value, 0) / present.length);
}

function multiplicativeScore(components: ReadinessComponent[]) {
  const present = components.filter((component) => typeof component.score === "number") as Array<ReadinessComponent & { score: number }>;
  if (present.length === 0) return 0;
  const product = present.reduce((value, component) => value * Math.max(component.score, 1) / 100, 1);
  return clampScore(100 * Math.pow(product, 1 / present.length));
}

function buildBlueprint(params: {
  roleTitle: string;
  experienceLevel: string;
  jd: JobDescriptionProfile;
  resume: ResumeProfile;
  companyName: string;
}): InterviewBlueprint {
  const text = normalizeText(`${params.roleTitle} ${params.experienceLevel} ${params.jd.rawText}`);
  const isSenior = /senior|lead|staff|principal|sde2|sde3|architect|manager/.test(text);
  const hasDesign = isSenior || /system design|architecture|distributed|scale|microservices|kafka/.test(text);
  const hasCoding = /software|engineer|developer|backend|frontend|full stack|algorithm|data structure|dsa/.test(text);
  const hasMachineCoding = /machine coding|low level design|lld|object oriented|solid/.test(text);
  const hasDomain = /payment|fintech|commerce|delivery|trading|security|ml|ai|data/.test(text);

  const rounds: InterviewBlueprintRound[] = [];
  if (hasCoding) {
    rounds.push({
      roundNumber: rounds.length + 1,
      name: "Technical Problem Solving",
      type: "coding",
      durationMinutes: 45,
      focusAreas: unique(["Data structures", "Algorithms", ...params.jd.skills.slice(0, 3)]),
      expectedSignals: ["Correctness", "Complexity analysis", "Clear communication while solving"],
    });
  }
  if (hasMachineCoding) {
    rounds.push({
      roundNumber: rounds.length + 1,
      name: "Machine Coding / Low-Level Design",
      type: "machine_coding",
      durationMinutes: 90,
      focusAreas: ["Class design", "Extensibility", "Tests or executable behavior"],
      expectedSignals: ["Readable code", "Requirement clarification", "Separation of concerns"],
    });
  }
  if (hasDesign) {
    rounds.push({
      roundNumber: rounds.length + 1,
      name: "System Design",
      type: "system_design",
      durationMinutes: 60,
      focusAreas: unique(["Scalability", "Data modeling", "Tradeoffs", ...params.jd.skills.filter((s) => /kafka|redis|postgres|aws|distributed/i.test(s)).slice(0, 3)]),
      expectedSignals: ["Capacity reasoning", "Failure modes", "Tradeoff clarity"],
    });
  }
  if (hasDomain) {
    rounds.push({
      roundNumber: rounds.length + 1,
      name: "Domain Deep Dive",
      type: "domain",
      durationMinutes: 45,
      focusAreas: params.jd.keywords.slice(0, 5),
      expectedSignals: ["Business context", "Operational risk awareness", "Practical prioritization"],
    });
  }
  rounds.push({
    roundNumber: rounds.length + 1,
    name: isSenior ? "Leadership and Behavioral" : "Behavioral and Role Fit",
    type: "behavioral",
    durationMinutes: 45,
    focusAreas: isSenior ? ["Ownership", "Mentorship", "Ambiguity", "Conflict"] : ["Ownership", "Learning", "Team collaboration"],
    expectedSignals: ["Specific examples", "Measurable impact", "Reflection"],
  });

  const difficultyBase = 45 + rounds.length * 8 + (isSenior ? 12 : 0) + (hasDesign ? 10 : 0);
  const difficultyScore = clampScore(difficultyBase) / 10;

  return {
    source: "role_jd_inferred",
    difficultyScore: Math.round(difficultyScore * 10) / 10,
    confidence: params.jd.rawText.length > 400 && params.resume.rawText.length > 400 ? 0.72 : 0.55,
    rounds,
    focusAreas: unique(rounds.flatMap((round) => round.focusAreas)).slice(0, 10),
    behavioralFocusAreas: unique(rounds.find((round) => round.type === "behavioral")?.focusAreas ?? []),
    communicationExpectations: [
      "Think aloud before committing to an approach",
      "Explain tradeoffs explicitly",
      "Use concrete metrics from past work when available",
    ],
    expectedHiringTimeline: null,
  };
}

function buildRoadmap(params: {
  missingSkills: string[];
  weakAreas: string[];
  blueprint: InterviewBlueprint;
}) {
  const priorities = unique([...params.missingSkills, ...params.weakAreas, ...params.blueprint.focusAreas]).slice(0, 8);
  const primary = priorities.length > 0 ? priorities : ["role-specific interview evidence"];

  return {
    sevenDayPlan: primary.slice(0, 3).map((item) => `Create one evidence-backed answer or drill for ${item}.`),
    fourteenDayPlan: primary.slice(0, 5).map((item) => `Run a timed practice loop for ${item} and record the gap.`),
    thirtyDayPlan: primary.slice(0, 6).map((item) => `Build durable fluency in ${item} with mock feedback and revision notes.`),
    ninetyDayPlan: primary.slice(0, 6).map((item) => `Turn ${item} into portfolio proof, interview stories, or production-grade examples.`),
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class InterviewAIV4Service {
  static parseResumeText(rawText: string, source: string): ResumeProfile {
    const text = rawText.trim();
    const skills = extractSkills(text);
    return {
      source,
      rawText: text,
      summary: text.split(/\n/).map((line) => line.trim()).find((line) => line.length > 60) ?? null,
      skills,
      experienceSignals: extractLines(text, /built|led|owned|designed|implemented|scaled|optimized|reduced|improved|managed/, 8),
      senioritySignals: extractLines(text, /senior|lead|mentor|architect|manager|owned|strategy|principal/, 6),
      projectSignals: extractLines(text, /project|built|designed|implemented|launched|deployed/, 8),
    };
  }

  static parseJobDescription(rawText: string, source: string): JobDescriptionProfile {
    const text = rawText.trim();
    const skills = extractSkills(text);
    const keywords = topKeywords(text, 24);
    return {
      source,
      rawText: text,
      skills,
      requirements: extractLines(text, /require|must|need|experience|proficient|strong|years/, 10),
      responsibilities: extractLines(text, /own|build|design|lead|work|deliver|collaborate|develop|scale/, 10),
      signals: extractLines(text, /ownership|communication|scale|latency|reliability|customer|security|quality|mentor/, 10),
      keywords,
      seniority: inferSeniority("", text),
    };
  }

  static async ensureCompany(companyName: string) {
    const name = companyName.trim();
    const normalizedName = normalizeText(name);
    const slug = slugify(name) || randomUUID();
    return prisma.company.upsert({
      where: { normalizedName },
      create: {
        name,
        normalizedName,
        slug,
        country: "IN",
        companyType: "unknown",
        industry: null,
        intelligence: json({ source: "user_target", createdBy: "interview_ai_v4" }),
      },
      update: {
        name,
      },
    });
  }

  static calculateReadiness(params: {
    resume: ResumeProfile;
    jd: JobDescriptionProfile;
    mockScores?: {
      overall?: number | null;
      behavioral?: number | null;
      communication?: number | null;
      systemDesign?: number | null;
      domain?: number | null;
    };
  }) {
    const skillCoverage = overlapScore(params.resume.skills, params.jd.skills);
    const resumeMatch = keywordCoverageScore(params.resume.rawText, params.jd.keywords);
    const jdMatch = componentAverage([skillCoverage, resumeMatch]);
    const mockPerformance = params.mockScores?.overall ?? null;
    const behavioral = params.mockScores?.behavioral ?? null;
    const communication = params.mockScores?.communication ?? null;
    const systemDesign = params.mockScores?.systemDesign ?? null;
    const domain = params.mockScores?.domain ?? null;

    const components: ReadinessComponent[] = [
      {
        key: "resumeMatch",
        label: "Resume Match",
        score: resumeMatch,
        explanation: resumeMatch === null ? "No JD keywords were available to compare." : "Share of top JD keywords evidenced in the resume text.",
      },
      {
        key: "jdMatch",
        label: "JD Match",
        score: jdMatch,
        explanation: jdMatch === null ? "Job description did not expose comparable requirements." : "Combined keyword and skill alignment against the target JD.",
      },
      {
        key: "skillCoverage",
        label: "Skill Coverage",
        score: skillCoverage,
        explanation: skillCoverage === null ? "No explicit required skills were extracted from the JD." : "Share of extracted JD skills present in the resume.",
      },
      {
        key: "mockPerformance",
        label: "Mock Performance",
        score: mockPerformance ?? null,
        explanation: mockPerformance === null ? "Complete a mock round to calibrate this component." : "Latest stored mock interview evaluation.",
      },
      {
        key: "behavioral",
        label: "Behavioral Score",
        score: behavioral ?? null,
        explanation: behavioral === null ? "No behavioral evaluation stored yet." : "Behavioral rubric score from mock evaluation.",
      },
      {
        key: "communication",
        label: "Communication Score",
        score: communication ?? null,
        explanation: communication === null ? "No communication evaluation stored yet." : "Communication rubric score from mock evaluation.",
      },
      {
        key: "systemDesign",
        label: "System Design Score",
        score: systemDesign ?? null,
        explanation: systemDesign === null ? "No system design evaluation stored yet." : "System design/tradeoff rubric score from mock evaluation.",
      },
      {
        key: "domain",
        label: "Domain Score",
        score: domain ?? null,
        explanation: domain === null ? "No domain-specific evaluation stored yet." : "Domain depth inferred from evaluated answers.",
      },
    ];

    return {
      overallScore: multiplicativeScore(components),
      status: mockPerformance === null ? "provisional" as const : "mock_calibrated" as const,
      components,
      formula: "geometric_mean(available: resume_match, jd_match, skill_coverage, mock_performance, behavioral, communication, system_design, domain)",
      missingInputs: components.filter((component) => component.score === null).map((component) => component.label),
    };
  }

  static async generateProfile(params: {
    userId: string;
    setup: HiringSetup;
    resume: ResumeProfile;
    jd: JobDescriptionProfile;
  }): Promise<IntelligenceProfile> {
    const company = await this.ensureCompany(params.setup.companyName);
    const roleSeniority = params.jd.seniority ?? inferSeniority(params.setup.roleTitle, params.jd.rawText);
    const blueprint = buildBlueprint({
      companyName: params.setup.companyName,
      roleTitle: params.setup.roleTitle,
      experienceLevel: params.setup.experienceLevel,
      jd: params.jd,
      resume: params.resume,
    });
    const readiness = this.calculateReadiness({ resume: params.resume, jd: params.jd });
    const missingSkills = params.jd.skills.filter((skill) => !params.resume.skills.some((candidate) => normalizeText(candidate) === normalizeText(skill)));
    const weakAreas = readiness.components.filter((component) => (component.score ?? 100) < 65).map((component) => component.label);
    const roadmap = buildRoadmap({ missingSkills, weakAreas, blueprint });
    const latestSalary = await prisma.salaryInsight.findFirst({
      where: {
        companyId: company.id,
        roleTitle: { contains: params.setup.roleTitle.split(/\s+/)[0] ?? params.setup.roleTitle, mode: "insensitive" },
      },
      orderBy: { confidence: "desc" },
    });

    const session = await prisma.interviewMockSession.create({
      data: {
        userId: params.userId,
        companyId: company.id,
        roleTitle: params.setup.roleTitle,
        mode: "blueprint",
        status: "profile_ready",
        targetLocation: params.setup.targetLocation ?? null,
        compensationTarget: params.setup.compensationTarget ?? null,
        experienceLevel: params.setup.experienceLevel,
        resumeSource: params.resume.source,
        jdSource: params.jd.source,
        normalizedProfile: json(params.resume),
        jobDescriptionAnalysis: json(params.jd),
        blueprint: json(blueprint),
        transcript: [],
        rounds: {
          create: blueprint.rounds.map((round) => ({
            roundNumber: round.roundNumber,
            type: round.type,
            name: round.name,
            durationMinutes: round.durationMinutes,
            status: round.roundNumber === 1 ? "ready" : "pending",
            difficultyScore: blueprint.difficultyScore,
            focusAreas: round.focusAreas,
            expectedSignals: json(round.expectedSignals),
          })),
        },
      },
      include: { rounds: true },
    });

    await prisma.readinessSnapshot.create({
      data: {
        userId: params.userId,
        sessionId: session.id,
        companyName: company.name,
        roleTitle: params.setup.roleTitle,
        overallScore: readiness.overallScore,
        resumeMatchScore: readiness.components.find((c) => c.key === "resumeMatch")?.score ?? 0,
        jdMatchScore: readiness.components.find((c) => c.key === "jdMatch")?.score ?? 0,
        skillCoverageScore: readiness.components.find((c) => c.key === "skillCoverage")?.score ?? 0,
        formulaTrace: json(readiness),
        explanations: json(readiness.components),
      },
    });

    await prisma.roadmapSnapshot.create({
      data: {
        userId: params.userId,
        sessionId: session.id,
        companyName: company.name,
        roleTitle: params.setup.roleTitle,
        sourceWeaknesses: json([...missingSkills, ...weakAreas]),
        sevenDayPlan: roadmap.sevenDayPlan,
        fourteenDayPlan: roadmap.fourteenDayPlan,
        thirtyDayPlan: roadmap.thirtyDayPlan,
        ninetyDayPlan: roadmap.ninetyDayPlan,
      },
    });

    const [readinessTrend, evaluatedSessions] = await Promise.all([
      prisma.readinessSnapshot.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      prisma.interviewEvaluation.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
    ]);

    return {
      sessionId: session.id,
      companyProfile: {
        name: company.name,
        slug: company.slug,
        industry: company.industry,
        tier: company.tier,
        evidence: company.lastIngestedAt ? ["CareerOS company graph"] : ["User-selected target company"],
      },
      roleProfile: {
        title: params.setup.roleTitle,
        experienceLevel: params.setup.experienceLevel,
        targetLocation: params.setup.targetLocation ?? null,
        seniority: roleSeniority,
        keyTechnicalAreas: unique([...params.jd.skills, ...params.jd.keywords.slice(0, 8)]).slice(0, 12),
      },
      salaryRange: latestSalary ? {
        currency: latestSalary.currency,
        min: latestSalary.totalMin ?? latestSalary.baseMin,
        median: latestSalary.totalMedian ?? latestSalary.baseMedian,
        max: latestSalary.totalMax ?? latestSalary.baseMax,
        confidence: latestSalary.confidence,
        source: latestSalary.sourceType,
      } : null,
      readiness,
      blueprint,
      preparationPriorities: unique([...missingSkills, ...weakAreas, ...blueprint.focusAreas]).slice(0, 10),
      roadmap,
      analytics: {
        readinessTrend: readinessTrend.map((snapshot) => ({ date: snapshot.createdAt.toISOString(), score: snapshot.overallScore })),
        mockTrend: evaluatedSessions.map((evaluation) => ({ date: evaluation.createdAt.toISOString(), score: evaluation.score })),
        communicationTrend: evaluatedSessions.flatMap((evaluation) => {
          const score = /communication/i.test(evaluation.communicationFeedback ?? "") ? evaluation.score : null;
          return typeof score === "number" ? [{ date: evaluation.createdAt.toISOString(), score }] : [];
        }),
      },
    };
  }

  static evaluateAnswerText(answerText: string, questionPrompt: string, focusAreas: string[]) {
    const normalized = normalizeText(answerText);
    const answerWords = words(answerText);
    const hasTradeoff = /tradeoff|trade-off|why|because|chose|alternative|instead|cost|latency|reliability|consistency/.test(normalized);
    const hasMetric = /\d+|qps|latency|p95|p99|users|requests|ms|seconds|percent|%/.test(answerText.toLowerCase());
    const hasStructure = /first|second|then|finally|situation|task|action|result|approach|step/.test(normalized);
    const focusHits = focusAreas.filter((area) => normalized.includes(normalizeText(area))).length;
    const questionTerms = topKeywords(questionPrompt, 8);
    const questionHits = questionTerms.filter((term) => normalized.includes(term)).length;

    const completeness = clampScore(Math.min(100, answerWords.length * 1.4 + focusHits * 10));
    const technicalDepth = clampScore(35 + questionHits * 8 + focusHits * 8 + (hasMetric ? 12 : 0) + (hasTradeoff ? 10 : 0));
    const communication = clampScore(40 + (hasStructure ? 25 : 0) + Math.min(answerWords.length, 160) / 4);
    const tradeoffs = clampScore(30 + (hasTradeoff ? 35 : 0) + (hasMetric ? 10 : 0) + focusHits * 5);
    const correctness = clampScore(35 + questionHits * 9 + focusHits * 7 + (answerWords.length > 80 ? 10 : 0));
    const confidence = clampScore(35 + (hasMetric ? 15 : 0) + (hasStructure ? 12 : 0) + (answerWords.length > 120 ? 10 : 0));
    const overall = clampScore((completeness + technicalDepth + communication + tradeoffs + correctness + confidence) / 6);

    const missing: string[] = [];
    if (!hasTradeoff) missing.push("tradeoff reasoning");
    if (!hasMetric) missing.push("scale or impact metrics");
    if (!hasStructure) missing.push("clear answer structure");
    if (focusHits === 0 && focusAreas.length > 0) missing.push(`explicit coverage of ${focusAreas.slice(0, 2).join(", ")}`);

    return {
      overall,
      communication,
      technicalDepth,
      correctness,
      tradeoffs,
      confidence,
      completeness,
      strengths: [
        ...(answerWords.length >= 80 ? ["Gives enough detail to evaluate beyond surface-level claims."] : []),
        ...(hasStructure ? ["Uses a traceable structure."] : []),
        ...(hasMetric ? ["Includes measurable scale or outcome signals."] : []),
        ...(hasTradeoff ? ["Explains at least one decision or tradeoff."] : []),
      ],
      improvements: missing.map((item) => `Add ${item}.`),
    };
  }

  static buildQuestion(round: {
    name: string;
    type: string;
    focusAreas: string[];
    roundNumber: number;
  }, params: {
    roleTitle: string;
    companyName?: string | null;
    previousAnswer?: string;
    lastEvaluation?: ReturnType<typeof InterviewAIV4Service.evaluateAnswerText>;
    followUpDepth?: number;
  }) {
    const focus = round.focusAreas[0] ?? "the target role";
    const company = params.companyName ? `${params.companyName} ` : "";
    const depth = params.followUpDepth ?? 0;

    if (!params.previousAnswer) {
      if (round.type === "system_design") {
        return `Let's do ${round.name}. Design a ${company}${params.roleTitle} system around ${focus}. Start with requirements, scale assumptions, data model, and the first major tradeoff.`;
      }
      if (round.type === "coding" || round.type === "machine_coding") {
        return `Let's start ${round.name}. Walk me through how you would solve a practical problem involving ${focus}. Explain constraints, approach, complexity, and edge cases before implementation.`;
      }
      if (round.type === "behavioral") {
        return `Tell me about a specific situation where you demonstrated ${focus}. I want the context, your decision, measurable outcome, and what you learned.`;
      }
      return `Let's go deep on ${focus} for the ${params.roleTitle} role. What is the hardest relevant problem you have solved, and how did you approach it?`;
    }

    const missing = params.lastEvaluation?.improvements.join(" ").toLowerCase() ?? "";
    if (missing.includes("tradeoff")) {
      return "Why did you choose that approach over the strongest alternative? Walk me through the tradeoff you rejected.";
    }
    if (missing.includes("metrics")) {
      return "Put numbers on this. What throughput, latency, user scale, failure rate, or business metric changed?";
    }
    if (missing.includes("structure")) {
      return "Reframe that more crisply: what was the problem, what options did you consider, what did you do, and what was the result?";
    }
    if (round.type === "system_design" || depth >= 2) {
      return "Now pressure test it: what bottleneck appears when traffic grows 100x, and what would you change first?";
    }
    return `Double click on ${focus}: what failure mode would an interviewer be most worried about, and how would you mitigate it?`;
  }

  static async startMockRound(userId: string, sessionId: string) {
    const session = await prisma.interviewMockSession.findFirst({
      where: { id: sessionId, userId },
      include: { company: true, rounds: { orderBy: { roundNumber: "asc" } }, questions: true },
    });
    if (!session) throw new Error("INTERVIEW_SESSION_NOT_FOUND");

    const round = session.rounds.find((item) => item.status === "ready" || item.status === "active") ?? session.rounds[0];
    if (!round) throw new Error("INTERVIEW_ROUND_NOT_FOUND");

    const questionText = this.buildQuestion(round, {
      roleTitle: session.roleTitle,
      companyName: session.company?.name ?? null,
    });

    const question = await prisma.mockInterviewQuestion.create({
      data: {
        sessionId: session.id,
        roundId: round.id,
        questionNumber: session.questions.length + 1,
        prompt: questionText,
        questionType: round.type,
        focusTopic: round.focusAreas[0] ?? null,
        difficultyScore: round.difficultyScore,
        persona: this.personaFor(session.company?.name, round.type),
        rationale: "First question generated from stored blueprint focus areas.",
      },
    });

    await prisma.mockInterviewRound.update({
      where: { id: round.id },
      data: { status: "active", startedAt: round.startedAt ?? new Date() },
    });

    const transcript = [{ speaker: "interviewer", text: question.prompt, timestamp: new Date().toISOString(), questionId: question.id }];
    await prisma.interviewMockSession.update({
      where: { id: session.id },
      data: {
        status: "active",
        mode: round.type,
        transcript: json(transcript),
      },
    });

    return {
      sessionId: session.id,
      roundId: round.id,
      questionId: question.id,
      status: "active",
      round: {
        roundNumber: round.roundNumber,
        name: round.name,
        type: round.type,
        focusAreas: round.focusAreas,
      },
      nextQuestion: question.prompt,
      focusTopic: question.focusTopic,
      personaState: question.persona,
      transcript,
    };
  }

  static async processMockResponse(userId: string, sessionId: string, candidateResponse: string) {
    const session = await prisma.interviewMockSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        company: true,
        rounds: { orderBy: { roundNumber: "asc" } },
        questions: { orderBy: { questionNumber: "asc" } },
        answers: true,
      },
    });
    if (!session) throw new Error("INTERVIEW_SESSION_NOT_FOUND");
    if (session.status === "completed") throw new Error("INTERVIEW_SESSION_COMPLETED");

    const currentQuestion = session.questions.at(-1);
    const currentRound = session.rounds.find((round) => round.id === currentQuestion?.roundId) ?? session.rounds.find((round) => round.status === "active") ?? session.rounds[0];
    if (!currentRound || !currentQuestion) throw new Error("INTERVIEW_QUESTION_NOT_FOUND");

    const answerEvaluation = this.evaluateAnswerText(candidateResponse, currentQuestion.prompt, currentRound.focusAreas);
    const answer = await prisma.interviewAnswer.create({
      data: {
        userId,
        sessionId: session.id,
        roundId: currentRound.id,
        questionId: currentQuestion.id,
        answerText: candidateResponse,
        wordCount: words(candidateResponse).length,
        evaluation: json(answerEvaluation),
        communicationScore: answerEvaluation.communication,
        technicalDepthScore: answerEvaluation.technicalDepth,
        correctnessScore: answerEvaluation.correctness,
        tradeoffsScore: answerEvaluation.tradeoffs,
        confidenceScore: answerEvaluation.confidence,
        completenessScore: answerEvaluation.completeness,
      },
    });

    const roundAnswerCount = session.answers.filter((item) => item.roundId === currentRound.id).length + 1;
    const shouldCompleteRound = roundAnswerCount >= 4 || (roundAnswerCount >= 3 && answerEvaluation.overall >= 78);
    const nextRound = shouldCompleteRound
      ? session.rounds.find((round) => round.roundNumber === currentRound.roundNumber + 1)
      : currentRound;
    const isInterviewComplete = shouldCompleteRound && !nextRound;

    let nextQuestion: string | null = null;
    let newQuestionId: string | null = null;

    if (!isInterviewComplete && nextRound) {
      if (shouldCompleteRound) {
        await prisma.mockInterviewRound.update({
          where: { id: currentRound.id },
          data: { status: "completed", completedAt: new Date() },
        });
        await prisma.mockInterviewRound.update({
          where: { id: nextRound.id },
          data: { status: "active", startedAt: new Date() },
        });
      }

      nextQuestion = this.buildQuestion(nextRound, {
        roleTitle: session.roleTitle,
        companyName: session.company?.name ?? null,
        previousAnswer: candidateResponse,
        lastEvaluation: answerEvaluation,
        followUpDepth: shouldCompleteRound ? 0 : roundAnswerCount,
      });

      const question = await prisma.mockInterviewQuestion.create({
        data: {
          sessionId: session.id,
          roundId: nextRound.id,
          questionNumber: session.questions.length + 1,
          prompt: nextQuestion,
          questionType: nextRound.type,
          focusTopic: nextRound.focusAreas[0] ?? null,
          difficultyScore: nextRound.difficultyScore,
          persona: this.personaFor(session.company?.name, nextRound.type, answerEvaluation.overall),
          rationale: shouldCompleteRound ? "Advanced to the next blueprint round." : "Follow-up generated from missing answer evidence.",
          followUpDepth: shouldCompleteRound ? 0 : roundAnswerCount,
        },
      });
      newQuestionId = question.id;
    }

    const oldTranscript = Array.isArray(session.transcript) ? session.transcript as Array<Record<string, unknown>> : [];
    const transcript = [
      ...oldTranscript,
      { speaker: "candidate", text: candidateResponse, timestamp: new Date().toISOString(), answerId: answer.id, evaluation: answerEvaluation },
      ...(nextQuestion ? [{ speaker: "interviewer", text: nextQuestion, timestamp: new Date().toISOString(), questionId: newQuestionId }] : []),
    ];

    const updatedSession = await prisma.interviewMockSession.update({
      where: { id: session.id },
      data: {
        status: isInterviewComplete ? "ready_for_evaluation" : "active",
        transcript: json(transcript),
        feedback: json({ latestAnswerEvaluation: answerEvaluation }),
      },
    });

    return {
      sessionId: updatedSession.id,
      status: updatedSession.status,
      answerEvaluation,
      nextQuestion,
      focusTopic: nextRound?.focusAreas[0] ?? null,
      personaState: this.personaFor(session.company?.name, nextRound?.type ?? currentRound.type, answerEvaluation.overall),
      isInterviewComplete,
      transcript,
    };
  }

  static async evaluateMockSession(userId: string, sessionId: string) {
    const session = await prisma.interviewMockSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        company: true,
        answers: true,
        rounds: true,
      },
    });
    if (!session) throw new Error("INTERVIEW_SESSION_NOT_FOUND");
    if (session.answers.length === 0) throw new Error("INTERVIEW_NO_ANSWERS");

    const scores = session.answers.map((answer) => answer.evaluation as Record<string, number>);
    const avg = (key: string) => clampScore(scores.reduce((sum, item) => sum + (typeof item[key] === "number" ? item[key] : 0), 0) / scores.length);
    const finalScore = avg("overall");
    const technicalDepth = avg("technicalDepth");
    const communication = avg("communication");
    const problemSolving = avg("correctness");
    const starBehavioral = avg("completeness");
    const tradeoffThinking = avg("tradeoffs");
    const strengths = unique(session.answers.flatMap((answer) => {
      const evaluation = answer.evaluation as { strengths?: string[] };
      return evaluation.strengths ?? [];
    })).slice(0, 5);
    const improvements = unique(session.answers.flatMap((answer) => {
      const evaluation = answer.evaluation as { improvements?: string[] };
      return evaluation.improvements ?? [];
    })).slice(0, 6);

    const summary = finalScore >= 75
      ? "The mock shows credible interview signal, with remaining gains available through sharper evidence and pressure testing."
      : "The mock exposed meaningful gaps that should be addressed before a high-stakes interview loop.";
    const nextDrill = improvements[0]
      ? `Redo the weakest answer and specifically ${improvements[0].replace(/^Add /, "add ").replace(/\.$/, "")}.`
      : "Repeat the strongest round under a stricter time limit and add one deeper tradeoff.";

    const evaluation = await prisma.interviewEvaluation.upsert({
      where: { sessionId: session.id },
      create: {
        userId,
        sessionId: session.id,
        score: finalScore,
        summary,
        technicalDepthFeedback: `Average technical depth: ${technicalDepth}/100.`,
        communicationFeedback: `Average communication: ${communication}/100.`,
        problemSolvingFeedback: `Average correctness/problem solving: ${problemSolving}/100.`,
        starBehavioralFeedback: `Average completeness/behavioral evidence: ${starBehavioral}/100.`,
        tradeoffFeedback: `Average tradeoff thinking: ${tradeoffThinking}/100.`,
        strengths,
        improvements,
        improvedAnswerExample: null,
        nextDrill,
      },
      update: {
        score: finalScore,
        summary,
        technicalDepthFeedback: `Average technical depth: ${technicalDepth}/100.`,
        communicationFeedback: `Average communication: ${communication}/100.`,
        problemSolvingFeedback: `Average correctness/problem solving: ${problemSolving}/100.`,
        starBehavioralFeedback: `Average completeness/behavioral evidence: ${starBehavioral}/100.`,
        tradeoffFeedback: `Average tradeoff thinking: ${tradeoffThinking}/100.`,
        strengths,
        improvements,
        nextDrill,
      },
    });

    const normalizedProfile = session.normalizedProfile as ResumeProfile;
    const jd = session.jobDescriptionAnalysis as JobDescriptionProfile;
    const readiness = this.calculateReadiness({
      resume: normalizedProfile,
      jd,
      mockScores: {
        overall: finalScore,
        behavioral: starBehavioral,
        communication,
        systemDesign: tradeoffThinking,
        domain: technicalDepth,
      },
    });
    const missingSkills = (jd.skills ?? []).filter((skill) => !(normalizedProfile.skills ?? []).some((candidate) => normalizeText(candidate) === normalizeText(skill)));
    const roadmap = buildRoadmap({
      missingSkills,
      weakAreas: improvements,
      blueprint: session.blueprint as InterviewBlueprint,
    });

    await prisma.readinessSnapshot.create({
      data: {
        userId,
        sessionId: session.id,
        companyName: session.company?.name ?? null,
        roleTitle: session.roleTitle,
        overallScore: readiness.overallScore,
        resumeMatchScore: readiness.components.find((c) => c.key === "resumeMatch")?.score ?? 0,
        jdMatchScore: readiness.components.find((c) => c.key === "jdMatch")?.score ?? 0,
        skillCoverageScore: readiness.components.find((c) => c.key === "skillCoverage")?.score ?? 0,
        mockPerformanceScore: finalScore,
        behavioralScore: starBehavioral,
        communicationScore: communication,
        systemDesignScore: tradeoffThinking,
        domainScore: technicalDepth,
        formulaTrace: json(readiness),
        explanations: json(readiness.components),
      },
    });

    await prisma.roadmapSnapshot.create({
      data: {
        userId,
        sessionId: session.id,
        companyName: session.company?.name ?? null,
        roleTitle: session.roleTitle,
        sourceWeaknesses: json(improvements),
        sevenDayPlan: roadmap.sevenDayPlan,
        fourteenDayPlan: roadmap.fourteenDayPlan,
        thirtyDayPlan: roadmap.thirtyDayPlan,
        ninetyDayPlan: roadmap.ninetyDayPlan,
      },
    });

    await prisma.interviewMockSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        scores: json({
          score: finalScore,
          rubric: {
            technicalDepth: { score: technicalDepth, feedback: `Average technical depth: ${technicalDepth}/100.` },
            communication: { score: communication, feedback: `Average communication: ${communication}/100.` },
            problemSolving: { score: problemSolving, feedback: `Average correctness/problem solving: ${problemSolving}/100.` },
            starBehavioral: { score: starBehavioral, feedback: `Average completeness/behavioral evidence: ${starBehavioral}/100.` },
            tradeoffThinking: { score: tradeoffThinking, feedback: `Average tradeoff thinking: ${tradeoffThinking}/100.` },
          },
        }),
        feedback: json({ summary, strengths, improvements, nextDrill }),
      },
    });

    return {
      sessionId: session.id,
      status: "completed",
      score: evaluation.score,
      summary: evaluation.summary,
      rubric: {
        technicalDepth: { score: technicalDepth, feedback: `Average technical depth: ${technicalDepth}/100.` },
        communication: { score: communication, feedback: `Average communication: ${communication}/100.` },
        problemSolving: { score: problemSolving, feedback: `Average correctness/problem solving: ${problemSolving}/100.` },
        starBehavioral: { score: starBehavioral, feedback: `Average completeness/behavioral evidence: ${starBehavioral}/100.` },
        tradeoffThinking: { score: tradeoffThinking, feedback: `Average tradeoff thinking: ${tradeoffThinking}/100.` },
      },
      strengths,
      improvements,
      improvedAnswerExample: null,
      nextDrill,
      readiness,
      roadmap,
    };
  }

  private static personaFor(companyName: string | null | undefined, roundType: string, score?: number) {
    const company = companyName ? `${companyName} ` : "";
    if (typeof score === "number" && score < 55) return `${company}interviewer - challenging`;
    if (roundType === "behavioral") return `${company}hiring manager`;
    if (roundType === "system_design") return `${company}senior engineer`;
    if (roundType === "machine_coding") return `${company}staff engineer`;
    return `${company}technical interviewer`;
  }
}
