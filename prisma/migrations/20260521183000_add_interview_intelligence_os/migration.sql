CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "InterviewQuestionKind" AS ENUM ('dsa','system_design','lld','hld','oop','dbms','sql','os','networking','devops','ml_ai','cloud','security','behavioral','oa_coding','oa_mcq','puzzle','aptitude');
CREATE TYPE "InterviewDifficulty" AS ENUM ('easy','medium','hard','expert','unknown');
CREATE TYPE "InterviewSourceType" AS ENUM ('leetcode','geeksforgeeks','reddit','glassdoor','blind','github','hackerrank','interviewbit','user_submission','company_seed','ai_inferred');
CREATE TYPE "InterviewModerationStatus" AS ENUM ('pending','approved','rejected','needs_review','quarantined');
CREATE TYPE "InterviewRoundType" AS ENUM ('recruiter_screen','online_assessment','technical','dsa','machine_coding','system_design','lld','hld','behavioral','hiring_manager','hr','aptitude','case_study');
CREATE TYPE "InterviewIngestionStatus" AS ENUM ('queued','crawling','normalizing','enriching','indexed','failed','skipped');
CREATE TYPE "InterviewContributionType" AS ENUM ('question','experience','recruiter_pattern','salary','correction');

CREATE TABLE "Company" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "normalizedName" text NOT NULL,
  "slug" text NOT NULL,
  "domain" text,
  "logoUrl" text,
  "country" text NOT NULL DEFAULT 'IN',
  "companyType" text NOT NULL DEFAULT 'unknown',
  "industry" text,
  "tier" text,
  "aliases" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "remoteFriendliness" double precision NOT NULL DEFAULT 0.5,
  "fresherFriendliness" double precision NOT NULL DEFAULT 0.5,
  "referralDominance" double precision NOT NULL DEFAULT 0.5,
  "collegeTierBias" double precision NOT NULL DEFAULT 0.5,
  "hiringSeasonality" jsonb NOT NULL DEFAULT '{}',
  "intelligence" jsonb NOT NULL DEFAULT '{}',
  "trustScore" double precision NOT NULL DEFAULT 0.5,
  "lastIngestedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyRole" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL,
  "title" text NOT NULL,
  "normalizedTitle" text NOT NULL,
  "level" text,
  "family" text NOT NULL DEFAULT 'engineering',
  "location" text,
  "indiaMarket" boolean NOT NULL DEFAULT true,
  "questionMix" jsonb NOT NULL DEFAULT '{}',
  "preparationWeeks" integer NOT NULL DEFAULT 4,
  "selectionRate" double precision,
  "confidence" double precision NOT NULL DEFAULT 0.55,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionCluster" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "canonicalTitle" text NOT NULL,
  "centroidSummary" text NOT NULL,
  "kind" "InterviewQuestionKind" NOT NULL,
  "difficulty" "InterviewDifficulty" NOT NULL DEFAULT 'unknown',
  "centroidHash" text,
  "size" integer NOT NULL DEFAULT 0,
  "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionCluster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewQuestion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "canonicalHash" text NOT NULL,
  "title" text NOT NULL,
  "prompt" text NOT NULL,
  "normalizedPrompt" text NOT NULL,
  "kind" "InterviewQuestionKind" NOT NULL,
  "difficulty" "InterviewDifficulty" NOT NULL DEFAULT 'unknown',
  "topic" text,
  "subtopic" text,
  "constraints" jsonb NOT NULL DEFAULT '{}',
  "examples" jsonb NOT NULL DEFAULT '[]',
  "sourceType" "InterviewSourceType" NOT NULL,
  "sourceUrl" text,
  "sourceTitle" text,
  "sourceAttribution" jsonb NOT NULL DEFAULT '{}',
  "moderationStatus" "InterviewModerationStatus" NOT NULL DEFAULT 'pending',
  "qualityScore" double precision NOT NULL DEFAULT 0.5,
  "originalityScore" double precision NOT NULL DEFAULT 0.5,
  "popularityScore" double precision NOT NULL DEFAULT 0,
  "freshnessScore" double precision NOT NULL DEFAULT 1,
  "lastSeenAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clusterId" uuid,
  CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionSolution" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "questionId" uuid NOT NULL,
  "bruteForce" jsonb NOT NULL DEFAULT '{}',
  "optimized" jsonb NOT NULL DEFAULT '{}',
  "explanations" jsonb NOT NULL DEFAULT '{}',
  "dryRun" jsonb NOT NULL DEFAULT '[]',
  "edgeCases" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "interviewerExpectations" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "followUps" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "languages" jsonb NOT NULL DEFAULT '{}',
  "timeComplexity" text,
  "spaceComplexity" text,
  "generatedBy" text NOT NULL DEFAULT 'gemini',
  "originalityDisclaimer" text NOT NULL DEFAULT 'Generated original explanation; not copied from source material.',
  "confidence" double precision NOT NULL DEFAULT 0.62,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionSolution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewExperience" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid,
  "companyId" uuid NOT NULL,
  "companyRoleId" uuid,
  "title" text NOT NULL,
  "roleTitle" text,
  "level" text,
  "location" text,
  "outcome" text NOT NULL DEFAULT 'unknown',
  "verdict" text,
  "overallDifficulty" "InterviewDifficulty" NOT NULL DEFAULT 'unknown',
  "roundsCount" integer,
  "timelineDays" integer,
  "rawText" text NOT NULL,
  "summary" text NOT NULL,
  "sourceType" "InterviewSourceType" NOT NULL,
  "sourceUrl" text,
  "sourceAttribution" jsonb NOT NULL DEFAULT '{}',
  "moderationStatus" "InterviewModerationStatus" NOT NULL DEFAULT 'pending',
  "trustScore" double precision NOT NULL DEFAULT 0.5,
  "recencyScore" double precision NOT NULL DEFAULT 1,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "occurredAt" timestamp(3),
  CONSTRAINT "InterviewExperience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewRound" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "experienceId" uuid NOT NULL,
  "roundNumber" integer NOT NULL,
  "type" "InterviewRoundType" NOT NULL,
  "title" text NOT NULL,
  "durationMinutes" integer,
  "difficulty" "InterviewDifficulty" NOT NULL DEFAULT 'unknown',
  "notes" text,
  "signals" jsonb NOT NULL DEFAULT '[]',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionFrequency" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "questionId" uuid NOT NULL,
  "companyId" uuid NOT NULL,
  "companyRoleId" uuid,
  "roundType" "InterviewRoundType",
  "askCount" integer NOT NULL DEFAULT 1,
  "recentAskCount" integer NOT NULL DEFAULT 0,
  "frequencyScore" double precision NOT NULL DEFAULT 0.1,
  "trendScore" double precision NOT NULL DEFAULT 0,
  "lastAskedAt" timestamp(3),
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionFrequency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BehavioralQuestion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "questionId" uuid NOT NULL,
  "theme" text NOT NULL,
  "competency" text NOT NULL,
  "starSignals" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "redFlags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "sampleFramework" jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BehavioralQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemDesignQuestion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "questionId" uuid NOT NULL,
  "designType" text NOT NULL DEFAULT 'hld',
  "scaleSignals" jsonb NOT NULL DEFAULT '{}',
  "expectedComponents" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "tradeoffs" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "evaluationRubric" jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemDesignQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecruiterPattern" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL,
  "recruiterName" text,
  "roleFamily" text,
  "responseRate" double precision NOT NULL DEFAULT 0.5,
  "ghostingRate" double precision NOT NULL DEFAULT 0.3,
  "avgResponseDays" double precision,
  "friendliness" double precision NOT NULL DEFAULT 0.5,
  "transparency" double precision NOT NULL DEFAULT 0.5,
  "negotiationStyle" text NOT NULL DEFAULT 'unknown',
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "trustScore" double precision NOT NULL DEFAULT 0.5,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterPattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryInsight" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL,
  "roleTitle" text NOT NULL,
  "level" text,
  "location" text NOT NULL DEFAULT 'India',
  "currency" text NOT NULL DEFAULT 'INR',
  "baseMin" double precision,
  "baseMedian" double precision,
  "baseMax" double precision,
  "totalMin" double precision,
  "totalMedian" double precision,
  "totalMax" double precision,
  "sampleSize" integer NOT NULL DEFAULT 1,
  "sourceType" "InterviewSourceType" NOT NULL DEFAULT 'user_submission',
  "confidence" double precision NOT NULL DEFAULT 0.5,
  "lastObservedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalaryInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SelectionPattern" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL,
  "companyRoleId" uuid,
  "selectionRate" double precision,
  "oaPassRate" double precision,
  "onsitePassRate" double precision,
  "rejectionReasons" jsonb NOT NULL DEFAULT '[]',
  "successSignals" jsonb NOT NULL DEFAULT '[]',
  "collegeTierImpact" double precision NOT NULL DEFAULT 0.5,
  "referralImpact" double precision NOT NULL DEFAULT 0.5,
  "confidence" double precision NOT NULL DEFAULT 0.5,
  "validFrom" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelectionPattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DifficultyTrend" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "companyId" uuid NOT NULL,
  "companyRoleId" uuid,
  "topic" text NOT NULL,
  "difficulty" "InterviewDifficulty" NOT NULL,
  "score" double precision NOT NULL,
  "periodStart" date NOT NULL,
  "periodEnd" date NOT NULL,
  "evidenceCount" integer NOT NULL DEFAULT 0,
  "confidence" double precision NOT NULL DEFAULT 0.5,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DifficultyTrend_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionTag" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" text NOT NULL,
  "label" text NOT NULL,
  "category" text NOT NULL DEFAULT 'topic',
  "description" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionEmbedding" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "questionId" uuid NOT NULL,
  "model" text NOT NULL DEFAULT 'text-embedding-3-small',
  "dimensions" integer NOT NULL DEFAULT 1536,
  "embedding" vector(1536),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewIngestionSource" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sourceType" "InterviewSourceType" NOT NULL,
  "name" text NOT NULL,
  "baseUrl" text NOT NULL,
  "robotsPolicy" jsonb NOT NULL DEFAULT '{}',
  "rateLimitPerHour" integer NOT NULL DEFAULT 60,
  "enabled" boolean NOT NULL DEFAULT true,
  "lastCrawledAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewIngestionSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewIngestionRun" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sourceId" uuid,
  "status" "InterviewIngestionStatus" NOT NULL DEFAULT 'queued',
  "query" text,
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "rawCount" integer NOT NULL DEFAULT 0,
  "insertedCount" integer NOT NULL DEFAULT 0,
  "skippedCount" integer NOT NULL DEFAULT 0,
  "error" text,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewIngestionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RawInterviewArtifact" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "runId" uuid,
  "sourceType" "InterviewSourceType" NOT NULL,
  "sourceUrl" text,
  "sourceTitle" text,
  "rawText" text NOT NULL,
  "rawHtmlHash" text,
  "extracted" jsonb NOT NULL DEFAULT '{}',
  "status" "InterviewIngestionStatus" NOT NULL DEFAULT 'queued',
  "dedupeHash" text NOT NULL,
  "error" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RawInterviewArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewContribution" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "type" "InterviewContributionType" NOT NULL,
  "status" "InterviewModerationStatus" NOT NULL DEFAULT 'pending',
  "companyName" text NOT NULL,
  "roleTitle" text,
  "payload" jsonb NOT NULL,
  "questionId" uuid,
  "experienceId" uuid,
  "trustDelta" double precision NOT NULL DEFAULT 0,
  "moderatorNote" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewContribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContributorReputation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "trustScore" double precision NOT NULL DEFAULT 0.4,
  "acceptedCount" integer NOT NULL DEFAULT 0,
  "rejectedCount" integer NOT NULL DEFAULT 0,
  "verificationBadges" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "lastContributionAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContributorReputation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewModerationEvent" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "contributionId" uuid,
  "entityType" text NOT NULL,
  "entityId" text,
  "decision" "InterviewModerationStatus" NOT NULL,
  "reasons" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "modelSignals" jsonb NOT NULL DEFAULT '{}',
  "reviewerId" uuid,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewPrediction" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid,
  "companyId" uuid,
  "companyRoleId" uuid,
  "query" text NOT NULL,
  "predictedQuestions" jsonb NOT NULL DEFAULT '[]',
  "weakAreas" jsonb NOT NULL DEFAULT '[]',
  "behavioralThemes" jsonb NOT NULL DEFAULT '[]',
  "systemDesignTopics" jsonb NOT NULL DEFAULT '[]',
  "selectionProbability" double precision NOT NULL DEFAULT 0.5,
  "oaDifficulty" double precision NOT NULL DEFAULT 0.5,
  "interviewDifficulty" double precision NOT NULL DEFAULT 0.5,
  "confidence" double precision NOT NULL DEFAULT 0.55,
  "reasoning" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3),
  CONSTRAINT "InterviewPrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewMockSession" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "companyId" uuid,
  "roleTitle" text NOT NULL,
  "mode" text NOT NULL DEFAULT 'mixed',
  "status" text NOT NULL DEFAULT 'active',
  "transcript" jsonb NOT NULL DEFAULT '[]',
  "scores" jsonb NOT NULL DEFAULT '{}',
  "feedback" jsonb NOT NULL DEFAULT '{}',
  "replayUrl" text,
  "startedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewMockSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewSearchEvent" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid,
  "query" text NOT NULL,
  "filters" jsonb NOT NULL DEFAULT '{}',
  "resultCount" integer NOT NULL DEFAULT 0,
  "latencyMs" integer,
  "clickedEntityType" text,
  "clickedEntityId" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewSearchEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_InterviewQuestionToInterviewRound" (
  "A" uuid NOT NULL,
  "B" uuid NOT NULL
);

CREATE TABLE "_InterviewQuestionToQuestionTag" (
  "A" uuid NOT NULL,
  "B" uuid NOT NULL
);

CREATE UNIQUE INDEX "Company_normalizedName_key" ON "Company"("normalizedName");
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_companyType_industry_idx" ON "Company"("companyType","industry");
CREATE INDEX "Company_tier_idx" ON "Company"("tier");
CREATE UNIQUE INDEX "CompanyRole_companyId_normalizedTitle_level_location_key" ON "CompanyRole"("companyId","normalizedTitle","level","location");
CREATE INDEX "CompanyRole_normalizedTitle_level_idx" ON "CompanyRole"("normalizedTitle","level");
CREATE UNIQUE INDEX "InterviewQuestion_canonicalHash_key" ON "InterviewQuestion"("canonicalHash");
CREATE INDEX "InterviewQuestion_kind_difficulty_idx" ON "InterviewQuestion"("kind","difficulty");
CREATE INDEX "InterviewQuestion_moderationStatus_qualityScore_idx" ON "InterviewQuestion"("moderationStatus","qualityScore");
CREATE INDEX "InterviewQuestion_popularityScore_freshnessScore_idx" ON "InterviewQuestion"("popularityScore","freshnessScore");
CREATE INDEX "InterviewQuestion_prompt_trgm_idx" ON "InterviewQuestion" USING gin ("normalizedPrompt" gin_trgm_ops);
CREATE UNIQUE INDEX "QuestionSolution_questionId_key" ON "QuestionSolution"("questionId");
CREATE INDEX "InterviewExperience_companyId_createdAt_idx" ON "InterviewExperience"("companyId","createdAt");
CREATE INDEX "InterviewExperience_companyRoleId_createdAt_idx" ON "InterviewExperience"("companyRoleId","createdAt");
CREATE INDEX "InterviewExperience_moderationStatus_trustScore_idx" ON "InterviewExperience"("moderationStatus","trustScore");
CREATE INDEX "InterviewRound_experienceId_roundNumber_idx" ON "InterviewRound"("experienceId","roundNumber");
CREATE UNIQUE INDEX "QuestionFrequency_questionId_companyId_companyRoleId_roundType_key" ON "QuestionFrequency"("questionId","companyId","companyRoleId","roundType");
CREATE INDEX "QuestionFrequency_companyId_frequencyScore_idx" ON "QuestionFrequency"("companyId","frequencyScore");
CREATE UNIQUE INDEX "BehavioralQuestion_questionId_key" ON "BehavioralQuestion"("questionId");
CREATE UNIQUE INDEX "SystemDesignQuestion_questionId_key" ON "SystemDesignQuestion"("questionId");
CREATE UNIQUE INDEX "QuestionTag_slug_key" ON "QuestionTag"("slug");
CREATE UNIQUE INDEX "QuestionCluster_centroidHash_key" ON "QuestionCluster"("centroidHash");
CREATE UNIQUE INDEX "QuestionEmbedding_questionId_key" ON "QuestionEmbedding"("questionId");
CREATE INDEX "QuestionEmbedding_embedding_hnsw_idx" ON "QuestionEmbedding" USING hnsw ("embedding" vector_cosine_ops);
CREATE UNIQUE INDEX "InterviewIngestionSource_sourceType_baseUrl_key" ON "InterviewIngestionSource"("sourceType","baseUrl");
CREATE UNIQUE INDEX "RawInterviewArtifact_dedupeHash_key" ON "RawInterviewArtifact"("dedupeHash");
CREATE UNIQUE INDEX "ContributorReputation_userId_key" ON "ContributorReputation"("userId");
CREATE INDEX "InterviewPrediction_userId_createdAt_idx" ON "InterviewPrediction"("userId","createdAt");
CREATE INDEX "InterviewMockSession_userId_createdAt_idx" ON "InterviewMockSession"("userId","createdAt");
CREATE INDEX "InterviewSearchEvent_userId_createdAt_idx" ON "InterviewSearchEvent"("userId","createdAt");
CREATE UNIQUE INDEX "_InterviewQuestionToInterviewRound_AB_unique" ON "_InterviewQuestionToInterviewRound"("A","B");
CREATE INDEX "_InterviewQuestionToInterviewRound_B_index" ON "_InterviewQuestionToInterviewRound"("B");
CREATE UNIQUE INDEX "_InterviewQuestionToQuestionTag_AB_unique" ON "_InterviewQuestionToQuestionTag"("A","B");
CREATE INDEX "_InterviewQuestionToQuestionTag_B_index" ON "_InterviewQuestionToQuestionTag"("B");

ALTER TABLE "CompanyRole" ADD CONSTRAINT "CompanyRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "QuestionCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionSolution" ADD CONSTRAINT "QuestionSolution_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewExperience" ADD CONSTRAINT "InterviewExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewExperience" ADD CONSTRAINT "InterviewExperience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewExperience" ADD CONSTRAINT "InterviewExperience_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewRound" ADD CONSTRAINT "InterviewRound_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "InterviewExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionFrequency" ADD CONSTRAINT "QuestionFrequency_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionFrequency" ADD CONSTRAINT "QuestionFrequency_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionFrequency" ADD CONSTRAINT "QuestionFrequency_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehavioralQuestion" ADD CONSTRAINT "BehavioralQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemDesignQuestion" ADD CONSTRAINT "SystemDesignQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruiterPattern" ADD CONSTRAINT "RecruiterPattern_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryInsight" ADD CONSTRAINT "SalaryInsight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SelectionPattern" ADD CONSTRAINT "SelectionPattern_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SelectionPattern" ADD CONSTRAINT "SelectionPattern_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DifficultyTrend" ADD CONSTRAINT "DifficultyTrend_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DifficultyTrend" ADD CONSTRAINT "DifficultyTrend_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionEmbedding" ADD CONSTRAINT "QuestionEmbedding_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewIngestionRun" ADD CONSTRAINT "InterviewIngestionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "InterviewIngestionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RawInterviewArtifact" ADD CONSTRAINT "RawInterviewArtifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "InterviewIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewContribution" ADD CONSTRAINT "InterviewContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewContribution" ADD CONSTRAINT "InterviewContribution_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewContribution" ADD CONSTRAINT "InterviewContribution_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "InterviewExperience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewMockSession" ADD CONSTRAINT "InterviewMockSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewSearchEvent" ADD CONSTRAINT "InterviewSearchEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_InterviewQuestionToInterviewRound" ADD CONSTRAINT "_InterviewQuestionToInterviewRound_A_fkey" FOREIGN KEY ("A") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InterviewQuestionToInterviewRound" ADD CONSTRAINT "_InterviewQuestionToInterviewRound_B_fkey" FOREIGN KEY ("B") REFERENCES "InterviewRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InterviewQuestionToQuestionTag" ADD CONSTRAINT "_InterviewQuestionToQuestionTag_A_fkey" FOREIGN KEY ("A") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InterviewQuestionToQuestionTag" ADD CONSTRAINT "_InterviewQuestionToQuestionTag_B_fkey" FOREIGN KEY ("B") REFERENCES "QuestionTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
