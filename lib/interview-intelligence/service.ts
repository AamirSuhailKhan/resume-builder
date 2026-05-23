import "server-only";
import {
  InterviewContributionType,
  InterviewDifficulty,
  InterviewModerationStatus,
  InterviewQuestionKind,
  InterviewSourceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { INDIA_COMPANIES_DATA } from "@/lib/data/india-companies-seed";
import { AIModelRouter } from "@/lib/ai/providers";
import { memoryService } from "@/lib/services/memory.service";
import { indexInterviewQuestion } from "@/lib/search/interview.search";
import {
  clamp,
  inferDifficulty,
  inferQuestionKind,
  inferRoundType,
  inferTopic,
  normalizeText,
  scoreRecency,
  slugify,
  splitQuestions,
  stableHash,
} from "./utils";

type JsonRecord = Record<string, unknown>;

export type InterviewSearchParams = {
  query: string;
  company?: string | undefined;
  role?: string | undefined;
  kind?: InterviewQuestionKind | undefined;
  difficulty?: InterviewDifficulty | undefined;
  limit?: number | undefined;
  userId?: string | undefined;
};

export type NormalizedQuestionInput = {
  prompt: string;
  title?: string | undefined;
  kind?: InterviewQuestionKind | undefined;
  difficulty?: InterviewDifficulty | undefined;
  topic?: string | undefined;
  companyName?: string | undefined;
  roleTitle?: string | undefined;
  level?: string | undefined;
  roundLabel?: string | undefined;
  sourceType: InterviewSourceType;
  sourceUrl?: string | undefined;
  sourceTitle?: string | undefined;
  sourceAttribution?: JsonRecord | undefined;
  occurredAt?: Date | undefined;
};

export type InterviewSearchResult = {
  question: {
    id: string;
    title: string;
    prompt: string;
    kind: InterviewQuestionKind;
    difficulty: InterviewDifficulty;
    topic: string | null;
    popularityScore: number;
    freshnessScore: number;
  };
  frequency?: {
    company: string;
    role?: string | null;
    askCount: number;
    frequencyScore: number;
    trendScore: number;
  } | undefined;
  ranking: {
    score: number;
    text: number;
    frequency: number;
    freshness: number;
    personalization: number;
  };
};

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function companyType(name: string) {
  const normalized = normalizeText(name);
  if (/tcs|infosys|wipro|accenture|capgemini|cognizant|hcl/.test(normalized)) return "service";
  if (/google|amazon|microsoft|meta|apple|netflix/.test(normalized)) return "faang_india";
  if (/flipkart|razorpay|swiggy|zomato|phonepe|cred|meesho|zepto|ola|paytm/.test(normalized)) return "product_india";
  if (/openai|anthropic|mistral|perplexity|ai/.test(normalized)) return "ai_startup";
  return "unknown";
}

function prepWeeksFor(kind: InterviewQuestionKind, difficulty: InterviewDifficulty) {
  const base = kind === "system_design" || kind === "hld" ? 6 : kind === "behavioral" ? 2 : 4;
  return difficulty === "hard" || difficulty === "expert" ? base + 2 : base;
}

function getRoleLevel(role?: string | null) {
  const value = normalizeText(role ?? "");
  if (/sde\s*3|staff|principal|architect/.test(value)) return "senior+";
  if (/sde\s*2|senior|lead/.test(value)) return "mid-senior";
  if (/ninja|fresher|graduate|sde\s*1|entry/.test(value)) return "entry";
  return null;
}

function keywordScore(query: string, text: string) {
  const queryTerms = new Set(normalizeText(query).split(" ").filter((term) => term.length > 2));
  if (queryTerms.size === 0) return 0;
  const haystack = normalizeText(text);
  let hits = 0;
  for (const term of queryTerms) {
    if (haystack.includes(term)) hits += 1;
  }
  return clamp(hits / queryTerms.size);
}

export class InterviewIntelligenceService {
  static async upsertCompany(name: string) {
    const normalizedName = normalizeText(name);
    if (!normalizedName) throw new Error("Company name is required.");
    const seed = INDIA_COMPANIES_DATA.find((company) => normalizeText(company.companyName) === normalizedName);

    return prisma.company.upsert({
      where: { normalizedName },
      create: {
        name: seed?.companyName ?? name.trim(),
        normalizedName,
        slug: seed?.companySlug ?? slugify(name),
        companyType: companyType(name),
        tier: seed?.tier ?? null,
        industry: companyType(name).includes("service") ? "IT services" : "technology",
        aliases: seed ? [seed.companyName] : [],
        fresherFriendliness: companyType(name) === "service" ? 0.82 : 0.45,
        referralDominance: companyType(name) === "service" ? 0.42 : 0.72,
        collegeTierBias: companyType(name) === "faang_india" ? 0.72 : companyType(name) === "service" ? 0.34 : 0.58,
        intelligence: json(seed ? {
          hiringProcess: seed.hiringProcess,
          dsaDifficulty: seed.dsaDifficulty,
          hiringStatus: seed.hiringStatus,
          tips: seed.interviewTips,
        } : {}),
      },
      update: compact({
        name: seed?.companyName ?? name.trim(),
        companyType: companyType(name),
        tier: seed?.tier,
        intelligence: seed ? json({
          hiringProcess: seed.hiringProcess,
          dsaDifficulty: seed.dsaDifficulty,
          hiringStatus: seed.hiringStatus,
          tips: seed.interviewTips,
        }) : undefined,
      }) as Prisma.CompanyUncheckedUpdateInput,
    });
  }

  static async upsertRole(companyId: string, roleTitle: string, level?: string | null) {
    const normalizedTitle = normalizeText(roleTitle || "software engineer");
    const roleLevel = level ?? getRoleLevel(roleTitle) ?? "general";
    return prisma.companyRole.upsert({
      where: {
        companyId_normalizedTitle_level_location: {
          companyId,
          normalizedTitle,
          level: roleLevel,
          location: "India",
        },
      },
      create: {
        companyId,
        title: roleTitle || "Software Engineer",
        normalizedTitle,
        level: roleLevel,
        location: "India",
        preparationWeeks: 4,
      },
      update: {
        title: roleTitle || "Software Engineer",
        preparationWeeks: 4,
      },
    });
  }

  static async ingestQuestion(input: NormalizedQuestionInput) {
    const normalizedPrompt = normalizeText(input.prompt);
    const kind = input.kind ?? inferQuestionKind(input.prompt);
    const difficulty = input.difficulty ?? inferDifficulty(input.prompt);
    const topic = input.topic ?? inferTopic(input.prompt);
    const canonicalHash = stableHash(`${kind}:${normalizedPrompt}`);
    const title = input.title ?? input.prompt.slice(0, 120);

    const question = await prisma.interviewQuestion.upsert({
      where: { canonicalHash },
      create: compact({
        canonicalHash,
        title,
        prompt: input.prompt,
        normalizedPrompt,
        kind,
        difficulty,
        topic,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        sourceTitle: input.sourceTitle,
        sourceAttribution: json(input.sourceAttribution ?? {}),
        moderationStatus: input.sourceType === "user_submission" ? "pending" : "approved",
        qualityScore: qualityScore(input.prompt, kind),
        originalityScore: input.sourceType === "ai_inferred" ? 0.72 : 0.58,
      }) as Prisma.InterviewQuestionUncheckedCreateInput,
      update: {
        lastSeenAt: new Date(),
        freshnessScore: scoreRecency(input.occurredAt ?? new Date()),
        popularityScore: { increment: 0.03 },
      },
    });

    if (kind === "behavioral") {
      await prisma.behavioralQuestion.upsert({
        where: { questionId: question.id },
        create: {
          questionId: question.id,
          theme: topic,
          competency: inferBehavioralCompetency(input.prompt),
          starSignals: ["Situation clarity", "Ownership", "Measurable outcome", "Reflection"],
          redFlags: ["Blaming others", "No concrete example", "No learning"],
        },
        update: {
          theme: topic,
          competency: inferBehavioralCompetency(input.prompt),
        },
      });
    }

    if (kind === "system_design" || kind === "hld" || kind === "lld") {
      await prisma.systemDesignQuestion.upsert({
        where: { questionId: question.id },
        create: {
          questionId: question.id,
          designType: kind === "lld" ? "lld" : "hld",
          expectedComponents: expectedDesignComponents(input.prompt),
          tradeoffs: ["latency vs consistency", "cost vs reliability", "simplicity vs extensibility"],
          evaluationRubric: json({ clarify: 20, architecture: 30, tradeoffs: 25, communication: 25 }),
        },
        update: {
          expectedComponents: expectedDesignComponents(input.prompt),
        },
      });
    }

    if (input.companyName) {
      const company = await this.upsertCompany(input.companyName);
      const role = input.roleTitle ? await this.upsertRole(company.id, input.roleTitle, input.level) : null;
      const roundType = inferRoundType(input.roundLabel ?? input.prompt);
      const existingFrequency = await prisma.questionFrequency.findFirst({
        where: {
          questionId: question.id,
          companyId: company.id,
          companyRoleId: role?.id ?? null,
          roundType,
        },
        select: { id: true },
      });
      if (existingFrequency) {
        await prisma.questionFrequency.update({
          where: { id: existingFrequency.id },
          data: {
            askCount: { increment: 1 },
            recentAskCount: { increment: 1 },
            frequencyScore: { increment: 0.04 },
            trendScore: { increment: 0.02 },
            lastAskedAt: input.occurredAt ?? new Date(),
          },
        });
      } else {
        await prisma.questionFrequency.create({
          data: {
            questionId: question.id,
            companyId: company.id,
            companyRoleId: role?.id ?? null,
            roundType,
            askCount: 1,
            recentAskCount: 1,
            frequencyScore: 0.18,
            trendScore: 0.08,
            lastAskedAt: input.occurredAt ?? new Date(),
            evidence: json([{ sourceType: input.sourceType, sourceUrl: input.sourceUrl, seenAt: new Date().toISOString() }]),
          },
        });
      }
    }

    void indexInterviewQuestion(question.id);
    return question;
  }

  static async ingestRawArtifact(params: {
    runId?: string | undefined;
    sourceType: InterviewSourceType;
    sourceUrl?: string | undefined;
    sourceTitle?: string | undefined;
    rawText: string;
    companyName?: string | undefined;
    roleTitle?: string | undefined;
  }) {
    const dedupeHash = stableHash(`${params.sourceType}:${params.sourceUrl ?? ""}:${params.rawText.slice(0, 2000)}`);
    const artifact = await prisma.rawInterviewArtifact.upsert({
      where: { dedupeHash },
      create: compact({
        runId: params.runId,
        sourceType: params.sourceType,
        sourceUrl: params.sourceUrl,
        sourceTitle: params.sourceTitle,
        rawText: params.rawText,
        dedupeHash,
        status: "normalizing",
      }) as Prisma.RawInterviewArtifactUncheckedCreateInput,
      update: {
        rawText: params.rawText,
        status: "normalizing",
      },
    });

    const questions = splitQuestions(params.rawText);
    let inserted = 0;
    for (const prompt of questions) {
      await this.ingestQuestion({
        prompt,
        companyName: params.companyName,
        roleTitle: params.roleTitle,
        sourceType: params.sourceType,
        sourceUrl: params.sourceUrl,
        sourceTitle: params.sourceTitle,
      });
      inserted += 1;
    }

    await prisma.rawInterviewArtifact.update({
      where: { id: artifact.id },
      data: {
        status: "indexed",
        extracted: json({ questionCount: inserted }),
      },
    });

    return { artifact, inserted };
  }

  static async seedIndiaCompanyIntelligence() {
    let inserted = 0;
    for (const seed of INDIA_COMPANIES_DATA) {
      const company = await this.upsertCompany(seed.companyName);
      const role = await this.upsertRole(company.id, "Software Engineer", null);
      for (const q of seed.knownQuestions ?? []) {
        const question = typeof q.question === "string" ? q.question : "";
        if (!question) continue;
        await this.ingestQuestion({
          prompt: question,
          title: question.slice(0, 100),
          kind: inferQuestionKind(`${q.type} ${question}`),
          difficulty: inferDifficulty(`${q.difficulty} ${question}`),
          topic: inferTopic(question),
          companyName: seed.companyName,
          roleTitle: role.title,
          sourceType: "company_seed",
          sourceTitle: `${seed.companyName} India seed`,
          sourceAttribution: { source: q.source ?? "CareerOS seed", publicHint: "Aggregated candidate reports" },
        });
        inserted += 1;
      }
      await this.refreshCompanySignals(company.id);
    }
    return { companies: INDIA_COMPANIES_DATA.length, questions: inserted };
  }

  static async search(params: InterviewSearchParams): Promise<InterviewSearchResult[]> {
    const startedAt = Date.now();
    const limit = Math.min(params.limit ?? 20, 50);
    const cacheKey = `interview:search:${stableHash(JSON.stringify(params))}`;
    const redis = getRedisClient();
    const cached = await redis?.get<InterviewSearchResult[]>(cacheKey).catch(() => null);
    if (cached) return cached;

    const company = params.company ? await prisma.company.findFirst({
      where: {
        OR: [
          { normalizedName: normalizeText(params.company) },
          { aliases: { has: params.company } },
          { name: { contains: params.company, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
    }) : null;

    const questions = await prisma.interviewQuestion.findMany({
      where: {
        moderationStatus: "approved",
        ...(params.kind ? { kind: params.kind } : {}),
        ...(params.difficulty ? { difficulty: params.difficulty } : {}),
        OR: [
          { title: { contains: params.query, mode: "insensitive" } },
          { prompt: { contains: params.query, mode: "insensitive" } },
          { topic: { contains: params.query, mode: "insensitive" } },
          ...(company ? [{ frequencies: { some: { companyId: company.id } } }] : []),
        ],
      },
      include: {
        frequencies: {
          ...(company ? { where: { companyId: company.id } } : {}),
          include: { company: true, companyRole: true },
          orderBy: [{ frequencyScore: "desc" }, { updatedAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [{ popularityScore: "desc" }, { lastSeenAt: "desc" }],
      take: limit * 2,
    });

    const personalization = await this.personalizationTerms(params.userId);
    const ranked = questions
      .map((question) => {
        const frequency = question.frequencies[0];
        const text = keywordScore(params.query, `${question.title} ${question.prompt} ${question.topic ?? ""}`);
        const freq = clamp((frequency?.frequencyScore ?? question.popularityScore) / 2);
        const fresh = question.freshnessScore;
        const personal = personalization.length ? keywordScore(personalization.join(" "), `${question.prompt} ${question.topic ?? ""}`) : 0.4;
        const score = clamp(text * 0.36 + freq * 0.28 + fresh * 0.18 + personal * 0.18);
        return {
          question: {
            id: question.id,
            title: question.title,
            prompt: question.prompt,
            kind: question.kind,
            difficulty: question.difficulty,
            topic: question.topic,
            popularityScore: question.popularityScore,
            freshnessScore: question.freshnessScore,
          },
          ...(frequency ? {
            frequency: {
              company: frequency.company.name,
              role: frequency.companyRole?.title ?? null,
              askCount: frequency.askCount,
              frequencyScore: frequency.frequencyScore,
              trendScore: frequency.trendScore,
            },
          } : {}),
          ranking: { score, text, frequency: freq, freshness: fresh, personalization: personal },
        };
      })
      .sort((a, b) => b.ranking.score - a.ranking.score)
      .slice(0, limit);

    await redis?.set(cacheKey, ranked, { ex: 300 }).catch(() => undefined);
    await prisma.interviewSearchEvent.create({
      data: {
        userId: params.userId ?? null,
        query: params.query,
        filters: json({ company: params.company, role: params.role, kind: params.kind, difficulty: params.difficulty }),
        resultCount: ranked.length,
        latencyMs: Date.now() - startedAt,
      },
    }).catch(() => undefined);

    return ranked;
  }

  static async getCompanyTerminal(companyName: string, roleTitle?: string | undefined, userId?: string | undefined) {
    const company = await this.upsertCompany(companyName);
    const role = roleTitle ? await this.upsertRole(company.id, roleTitle, getRoleLevel(roleTitle)) : null;
    const [questions, experiences, recruiterPatterns, salaries, selectionPatterns, trends, prediction, user, contributionCount] = await Promise.all([
      prisma.questionFrequency.findMany({
        where: { companyId: company.id, ...(role ? { companyRoleId: role.id } : {}) },
        include: { question: { include: { solution: true } }, companyRole: true },
        orderBy: [{ frequencyScore: "desc" }, { trendScore: "desc" }],
        take: 12,
      }),
      prisma.interviewExperience.findMany({
        where: { companyId: company.id, moderationStatus: "approved", ...(role ? { companyRoleId: role.id } : {}) },
        include: { rounds: true },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.recruiterPattern.findMany({ where: { companyId: company.id }, orderBy: { trustScore: "desc" }, take: 3 }),
      prisma.salaryInsight.findMany({ where: { companyId: company.id, ...(roleTitle ? { roleTitle: { contains: roleTitle, mode: "insensitive" } } : {}) }, orderBy: { confidence: "desc" }, take: 3 }),
      prisma.selectionPattern.findMany({ where: { companyId: company.id, ...(role ? { companyRoleId: role.id } : {}) }, orderBy: { validFrom: "desc" }, take: 1 }),
      prisma.difficultyTrend.findMany({ where: { companyId: company.id, ...(role ? { companyRoleId: role.id } : {}) }, orderBy: { periodEnd: "desc" }, take: 8 }),
      this.predict(compact({ query: `${companyName} ${roleTitle ?? ""}`, companyName, roleTitle, userId }) as {
        query: string;
        companyName?: string | undefined;
        roleTitle?: string | undefined;
        userId?: string | undefined;
      }),
      userId ? prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }) : Promise.resolve(null),
      userId ? prisma.interviewContribution.count({ where: { userId } }) : Promise.resolve(0),
    ]);

    const mix = topicMix(questions.map((item) => item.question.kind));
    const hasUnlocked = user ? (user.plan !== "free" || contributionCount > 0) : false;

    return {
      company,
      role,
      topQuestions: questions,
      experiences,
      recruiterPatterns,
      salaries,
      selectionPattern: selectionPatterns[0] ?? null,
      difficultyTrends: trends,
      questionMix: mix,
      prediction,
      hasUnlocked,
      prepPlan: buildPrepPlan(compact({ companyName, roleTitle, questions: questions.map((item) => item.question), prediction }) as {
        companyName: string;
        roleTitle?: string | undefined;
        questions: Array<{ kind: InterviewQuestionKind; difficulty: InterviewDifficulty; topic: string | null; title: string }>;
        prediction: { weakAreas: Prisma.JsonValue; selectionProbability: number; confidence: number };
      }),
    };
  }

  static async predict(params: { query: string; companyName?: string | undefined; roleTitle?: string | undefined; userId?: string | undefined }) {
    const company = params.companyName ? await this.upsertCompany(params.companyName) : null;
    const role = company && params.roleTitle ? await this.upsertRole(company.id, params.roleTitle, getRoleLevel(params.roleTitle)) : null;
    const searchResults = await this.search(compact({
      query: params.query,
      company: params.companyName,
      role: params.roleTitle,
      limit: 10,
      userId: params.userId,
    }) as InterviewSearchParams);

    const kinds = searchResults.map((result) => result.question.kind);
    const hardRatio = searchResults.filter((result) => result.question.difficulty === "hard" || result.question.difficulty === "expert").length / Math.max(searchResults.length, 1);
    const behavioralThemes = searchResults
      .filter((result) => result.question.kind === "behavioral")
      .map((result) => result.question.topic ?? "Behavioral")
      .slice(0, 5);
    const systemTopics = searchResults
      .filter((result) => result.question.kind === "system_design" || result.question.kind === "hld" || result.question.kind === "lld")
      .map((result) => result.question.title)
      .slice(0, 5);
    const weakAreas = await this.weakAreas(params.userId, searchResults);
    const serviceCompany = params.companyName ? companyType(params.companyName) === "service" : false;
    const selectionProbability = clamp(0.56 - hardRatio * 0.22 + (serviceCompany ? 0.12 : 0) - weakAreas.length * 0.035);

    const prediction = await prisma.interviewPrediction.create({
      data: compact({
        userId: params.userId ?? null,
        companyId: company?.id ?? null,
        companyRoleId: role?.id ?? null,
        query: params.query,
        predictedQuestions: json(searchResults.slice(0, 8)),
        weakAreas: json(weakAreas),
        behavioralThemes: json(behavioralThemes.length ? behavioralThemes : ["ownership", "ambiguity", "conflict"]),
        systemDesignTopics: json(systemTopics),
        selectionProbability,
        oaDifficulty: clamp((kinds.filter((kind) => kind === "oa_coding" || kind === "dsa").length / Math.max(kinds.length, 1)) * 0.8 + hardRatio * 0.3),
        interviewDifficulty: clamp(0.42 + hardRatio * 0.45),
        confidence: clamp(0.48 + searchResults.length / 30),
        reasoning: [
          `Prediction uses ${searchResults.length} matched interview signals.`,
          hardRatio > 0.4 ? "Recent pattern is skewed toward hard technical screens." : "Pattern is mixed enough for focused preparation.",
          serviceCompany ? "Service-company pattern increases aptitude and communication weight." : "Product-company pattern increases DSA/design depth weight.",
        ].join(" "),
        evidence: json(searchResults.slice(0, 5).map((result) => ({
          questionId: result.question.id,
          title: result.question.title,
          frequency: result.frequency?.frequencyScore,
          rank: result.ranking.score,
        }))),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }) as Prisma.InterviewPredictionUncheckedCreateInput,
    });

    return prediction;
  }

  static async generateSolution(questionId: string) {
    const question = await prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { solution: true },
    });
    if (!question) throw new Error("Question not found.");
    if (question.solution) return question.solution;

    const fallback = fallbackSolution(question.prompt, question.kind);
    let generated = fallback;

    try {
      const raw = await AIModelRouter.executeTask<string>(
        [
          "Generate an original interview solution. Do not copy from any source.",
          "Return JSON with bruteForce, optimized, explanations, dryRun, edgeCases, interviewerExpectations, followUps, languages, timeComplexity, spaceComplexity.",
          `Question: ${question.prompt}`,
          "Languages: C++, Java, Python, JavaScript, Go.",
        ].join("\n"),
        { model: "premium", temperature: 0.2, maxTokens: 3000 }
      );
      generated = { ...fallback, ...JSON.parse(raw) };
    } catch {
      generated = fallback;
    }

    return prisma.questionSolution.create({
      data: {
        questionId,
        bruteForce: json(generated.bruteForce),
        optimized: json(generated.optimized),
        explanations: json(generated.explanations),
        dryRun: json(generated.dryRun),
        edgeCases: generated.edgeCases,
        interviewerExpectations: generated.interviewerExpectations,
        followUps: generated.followUps,
        languages: json(generated.languages),
        timeComplexity: generated.timeComplexity,
        spaceComplexity: generated.spaceComplexity,
        generatedBy: process.env.GEMINI_API_KEY ? "gemini" : "deterministic-fallback",
        confidence: process.env.GEMINI_API_KEY ? 0.74 : 0.45,
      },
    });
  }

  static async embedQuestion(questionId: string) {
    const question = await prisma.interviewQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new Error("Question not found.");
    const embedding = await memoryService.embedText(`${question.title}\n${question.prompt}\n${question.topic ?? ""}`);
    const vectorLiteral = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO "QuestionEmbedding" (id, "questionId", model, dimensions, embedding, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}::uuid, ${questionId}::uuid, 'text-embedding-3-small', 1536, ${vectorLiteral}::vector, NOW(), NOW())
      ON CONFLICT ("questionId") DO UPDATE
      SET embedding = EXCLUDED.embedding, "updatedAt" = NOW()
    `;
    return { questionId, dimensions: embedding.length };
  }

  static async submitContribution(userId: string, input: {
    type: InterviewContributionType;
    companyName: string;
    roleTitle?: string | undefined;
    payload: JsonRecord;
  }) {
    const moderation = moderateContribution(input.payload);
    const contribution = await prisma.interviewContribution.create({
      data: compact({
        userId,
        type: input.type,
        companyName: input.companyName,
        roleTitle: input.roleTitle,
        payload: json(input.payload),
        status: moderation.status,
        trustDelta: moderation.status === "approved" ? 0.04 : 0,
        moderatorNote: moderation.reasons.join("; "),
      }) as Prisma.InterviewContributionUncheckedCreateInput,
    });

    await prisma.contributorReputation.upsert({
      where: { userId },
      create: {
        userId,
        trustScore: moderation.status === "approved" ? 0.44 : 0.38,
        acceptedCount: moderation.status === "approved" ? 1 : 0,
        rejectedCount: moderation.status === "rejected" ? 1 : 0,
        lastContributionAt: new Date(),
      },
      update: compact({
        trustScore: { increment: moderation.status === "approved" ? 0.02 : -0.03 },
        acceptedCount: moderation.status === "approved" ? { increment: 1 } : undefined,
        rejectedCount: moderation.status === "rejected" ? { increment: 1 } : undefined,
        lastContributionAt: new Date(),
      }) as Prisma.ContributorReputationUncheckedUpdateInput,
    });

    await prisma.interviewModerationEvent.create({
      data: {
        contributionId: contribution.id,
        entityType: "InterviewContribution",
        entityId: contribution.id,
        decision: moderation.status,
        reasons: moderation.reasons,
        modelSignals: json(moderation.signals),
      },
    });

    if (moderation.status === "approved" && input.type === "question" && typeof input.payload.question === "string") {
      const question = await this.ingestQuestion({
        prompt: input.payload.question,
        companyName: input.companyName,
        roleTitle: input.roleTitle,
        sourceType: "user_submission",
        sourceAttribution: { contributionId: contribution.id },
      });
      await prisma.interviewContribution.update({
        where: { id: contribution.id },
        data: { questionId: question.id },
      });
    }


    return contribution;
  }

  static async startMockSession(userId: string, input: { companyName?: string | undefined; roleTitle: string; mode?: string | undefined }) {
    const company = input.companyName ? await this.upsertCompany(input.companyName) : null;
    const terminal = input.companyName ? await this.getCompanyTerminal(input.companyName, input.roleTitle, userId) : null;
    const openingQuestion = terminal?.topQuestions?.[0]?.question?.prompt ?? "Tell me about a project where you made a difficult technical tradeoff.";

    return prisma.interviewMockSession.create({
      data: {
        userId,
        companyId: company?.id ?? null,
        roleTitle: input.roleTitle,
        mode: input.mode ?? "mixed",
        transcript: json([
          {
            speaker: "interviewer",
            text: openingQuestion,
            timestamp: new Date().toISOString(),
          },
        ]),
        feedback: json({ next: "Answer with context, tradeoffs, decision, and measurable result." }),
      },
    });
  }

  static async refreshCompanySignals(companyId: string) {
    const [frequencies, experiences] = await Promise.all([
      prisma.questionFrequency.findMany({ where: { companyId }, include: { question: true } }),
      prisma.interviewExperience.findMany({ where: { companyId } }),
    ]);
    const hard = frequencies.filter((item) => item.question.difficulty === "hard" || item.question.difficulty === "expert").length;
    const dsa = frequencies.filter((item) => item.question.kind === "dsa").length;
    const design = frequencies.filter((item) => item.question.kind === "system_design" || item.question.kind === "hld" || item.question.kind === "lld").length;
    const behavioral = frequencies.filter((item) => item.question.kind === "behavioral").length;
    const total = Math.max(frequencies.length, 1);
    await prisma.company.update({
      where: { id: companyId },
      data: {
        intelligence: json({
          dsaEmphasis: dsa / total,
          designEmphasis: design / total,
          behavioralEmphasis: behavioral / total,
          difficulty: hard / total,
          experienceCount: experiences.length,
          updatedAt: new Date().toISOString(),
        }),
        lastIngestedAt: new Date(),
      },
    });
  }

  private static async personalizationTerms(userId?: string) {
    return [];
  }

  private static async weakAreas(userId: string | undefined, results: InterviewSearchResult[]) {
    const topics = Array.from(new Set(results.map((result) => result.question.topic).filter(Boolean).map(String)));
    return topics.slice(0, 3).map((topic) => ({ topic, reason: "High company frequency", confidence: 0.52 }));
  }
}

function qualityScore(prompt: string, kind: InterviewQuestionKind) {
  const lengthScore = clamp(prompt.length / 360);
  const specificity = /design|implement|given|array|string|system|tell me about|why/i.test(prompt) ? 0.2 : 0;
  return clamp(0.38 + lengthScore * 0.35 + specificity + (kind === "behavioral" ? 0.05 : 0));
}

function inferBehavioralCompetency(prompt: string) {
  const text = normalizeText(prompt);
  if (/conflict|disagree/.test(text)) return "conflict management";
  if (/lead|mentor/.test(text)) return "leadership";
  if (/failure|mistake/.test(text)) return "learning from failure";
  if (/pressure|deadline/.test(text)) return "pressure handling";
  return "ownership";
}

function expectedDesignComponents(prompt: string) {
  const text = normalizeText(prompt);
  if (/payment|razorpay|wallet/.test(text)) return ["API gateway", "ledger", "idempotency", "fraud checks", "reconciliation"];
  if (/delivery|eta|zepto|swiggy|zomato/.test(text)) return ["geo index", "order service", "dispatch", "tracking", "event stream"];
  if (/url shortener/.test(text)) return ["short code generator", "redirect service", "analytics", "cache", "database"];
  return ["API", "data model", "cache", "queue", "observability"];
}

function topicMix(kinds: InterviewQuestionKind[]) {
  const total = Math.max(kinds.length, 1);
  const count = (kind: InterviewQuestionKind) => kinds.filter((item) => item === kind).length / total;
  return {
    dsa: count("dsa"),
    systemDesign: count("system_design") + count("hld") + count("lld"),
    behavioral: count("behavioral"),
    oa: count("oa_coding") + count("oa_mcq") + count("aptitude"),
    fundamentals: count("oop") + count("dbms") + count("os") + count("networking"),
  };
}

function buildPrepPlan(params: {
  companyName: string;
  roleTitle?: string | undefined;
  questions: Array<{ kind: InterviewQuestionKind; difficulty: InterviewDifficulty; topic: string | null; title: string }>;
  prediction: { weakAreas: Prisma.JsonValue; selectionProbability: number; confidence: number };
}) {
  const hard = params.questions.some((question) => question.difficulty === "hard" || question.difficulty === "expert");
  const hasDesign = params.questions.some((question) => question.kind === "system_design" || question.kind === "hld" || question.kind === "lld");
  const weeks = Math.max(...params.questions.map((question) => prepWeeksFor(question.kind, question.difficulty)), hard ? 6 : 4);
  return {
    headline: `${weeks}-week prep plan for ${params.companyName}${params.roleTitle ? ` ${params.roleTitle}` : ""}`,
    weeks,
    dailyLoop: ["45m pattern drilling", "45m timed solving", "20m explanation aloud", "10m notes update"],
    focus: [
      hard ? "Hard DSA under time pressure" : "Medium DSA accuracy",
      hasDesign ? "System design tradeoffs and capacity thinking" : "CS fundamentals and role stories",
      "Behavioral examples using STAR with measurable outcomes",
    ],
    checkpoints: [
      "Day 3: solve top repeated pattern without hints",
      "Day 7: mock interview with follow-ups",
      "Final 48h: revise company-specific signals and recruiter notes",
    ],
    selectionProbability: params.prediction.selectionProbability,
  };
}

function fallbackSolution(prompt: string, kind: InterviewQuestionKind) {
  const isDesign = kind === "system_design" || kind === "hld" || kind === "lld";
  return {
    bruteForce: isDesign
      ? { approach: "Start with a simple single-service design and identify where it breaks under load." }
      : { approach: "Use the direct simulation or nested-loop approach first to establish correctness." },
    optimized: isDesign
      ? { approach: "Separate read/write paths, add caching, queues, idempotency, and observability where required." }
      : { approach: "Use the dominant pattern for the topic: hashing, two pointers, graph traversal, heap, or dynamic programming." },
    explanations: {
      intuition: `Break the problem into constraints, state, transitions, and edge cases. Prompt: ${prompt.slice(0, 180)}`,
      interviewerFocus: "Correctness first, then complexity, communication, and tradeoffs.",
    },
    dryRun: [{ step: 1, note: "Clarify inputs and expected output." }, { step: 2, note: "Walk through a representative example." }],
    edgeCases: ["empty input", "duplicates", "large input", "invalid state"],
    interviewerExpectations: ["clarify constraints", "explain tradeoffs", "test edge cases", "communicate complexity"],
    followUps: ["How would this change at 10x scale?", "Can you reduce space?", "What failure modes matter?"],
    languages: {
      cpp: "// Original solution scaffold generated by CareerOS",
      java: "// Original solution scaffold generated by CareerOS",
      python: "# Original solution scaffold generated by CareerOS",
      javascript: "// Original solution scaffold generated by CareerOS",
      go: "// Original solution scaffold generated by CareerOS",
    },
    timeComplexity: isDesign ? "Depends on bottleneck; discuss per API." : "O(n) to O(n log n), depending on selected pattern.",
    spaceComplexity: isDesign ? "Depends on retention/cache strategy." : "O(n) auxiliary space in common optimized forms.",
  };
}

function moderateContribution(payload: JsonRecord): {
  status: InterviewModerationStatus;
  reasons: string[];
  signals: JsonRecord;
} {
  const text = JSON.stringify(payload).toLowerCase();
  const reasons: string[] = [];
  if (text.length < 30) reasons.push("Too little detail");
  if (/buy now|telegram|whatsapp|guaranteed selection|leaked paper/.test(text)) reasons.push("Spam or unethical content indicators");
  if (/password|api key|secret|confidential/.test(text)) reasons.push("Sensitive information");
  if (reasons.some((reason) => reason.includes("Spam") || reason.includes("Sensitive"))) {
    return { status: "rejected", reasons, signals: { spam: true } };
  }
  if (reasons.length) return { status: "needs_review", reasons, signals: { lowDetail: true } };
  return { status: "approved", reasons: ["Passed automated moderation"], signals: { lowRisk: true } };
}
