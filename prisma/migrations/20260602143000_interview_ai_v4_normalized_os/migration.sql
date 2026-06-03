ALTER TABLE "InterviewMockSession"
  ADD COLUMN IF NOT EXISTS "targetLocation" text,
  ADD COLUMN IF NOT EXISTS "compensationTarget" text,
  ADD COLUMN IF NOT EXISTS "experienceLevel" text,
  ADD COLUMN IF NOT EXISTS "resumeSource" text,
  ADD COLUMN IF NOT EXISTS "jdSource" text,
  ADD COLUMN IF NOT EXISTS "normalizedProfile" jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "jobDescriptionAnalysis" jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "blueprint" jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "MockInterviewRound" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" uuid NOT NULL,
  "roundNumber" integer NOT NULL,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "durationMinutes" integer,
  "status" text NOT NULL DEFAULT 'pending',
  "difficultyScore" double precision,
  "focusAreas" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "expectedSignals" jsonb NOT NULL DEFAULT '[]',
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockInterviewRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MockInterviewQuestion" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" uuid NOT NULL,
  "roundId" uuid,
  "questionNumber" integer NOT NULL,
  "prompt" text NOT NULL,
  "questionType" text NOT NULL,
  "focusTopic" text,
  "difficultyScore" double precision,
  "persona" text,
  "rationale" text,
  "followUpDepth" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockInterviewQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InterviewAnswer" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "sessionId" uuid NOT NULL,
  "roundId" uuid,
  "questionId" uuid,
  "answerText" text NOT NULL,
  "wordCount" integer NOT NULL DEFAULT 0,
  "evaluation" jsonb NOT NULL DEFAULT '{}',
  "communicationScore" double precision,
  "technicalDepthScore" double precision,
  "correctnessScore" double precision,
  "tradeoffsScore" double precision,
  "confidenceScore" double precision,
  "completenessScore" double precision,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReadinessSnapshot" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "sessionId" uuid,
  "companyName" text,
  "roleTitle" text NOT NULL,
  "overallScore" integer NOT NULL,
  "resumeMatchScore" integer NOT NULL,
  "jdMatchScore" integer NOT NULL,
  "skillCoverageScore" integer NOT NULL,
  "mockPerformanceScore" integer,
  "behavioralScore" integer,
  "communicationScore" integer,
  "systemDesignScore" integer,
  "domainScore" integer,
  "formulaTrace" jsonb NOT NULL DEFAULT '{}',
  "explanations" jsonb NOT NULL DEFAULT '[]',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoadmapSnapshot" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "sessionId" uuid,
  "companyName" text,
  "roleTitle" text NOT NULL,
  "sourceWeaknesses" jsonb NOT NULL DEFAULT '[]',
  "sevenDayPlan" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "fourteenDayPlan" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "thirtyDayPlan" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "ninetyDayPlan" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoadmapSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MockInterviewRound_sessionId_roundNumber_key" ON "MockInterviewRound"("sessionId","roundNumber");
CREATE INDEX IF NOT EXISTS "MockInterviewRound_sessionId_status_idx" ON "MockInterviewRound"("sessionId","status");
CREATE INDEX IF NOT EXISTS "MockInterviewRound_type_status_idx" ON "MockInterviewRound"("type","status");
CREATE INDEX IF NOT EXISTS "MockInterviewQuestion_sessionId_questionNumber_idx" ON "MockInterviewQuestion"("sessionId","questionNumber");
CREATE INDEX IF NOT EXISTS "MockInterviewQuestion_roundId_questionNumber_idx" ON "MockInterviewQuestion"("roundId","questionNumber");
CREATE INDEX IF NOT EXISTS "InterviewAnswer_userId_createdAt_idx" ON "InterviewAnswer"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "InterviewAnswer_sessionId_createdAt_idx" ON "InterviewAnswer"("sessionId","createdAt");
CREATE INDEX IF NOT EXISTS "InterviewAnswer_roundId_createdAt_idx" ON "InterviewAnswer"("roundId","createdAt");
CREATE INDEX IF NOT EXISTS "ReadinessSnapshot_userId_createdAt_idx" ON "ReadinessSnapshot"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "ReadinessSnapshot_sessionId_createdAt_idx" ON "ReadinessSnapshot"("sessionId","createdAt");
CREATE INDEX IF NOT EXISTS "RoadmapSnapshot_userId_createdAt_idx" ON "RoadmapSnapshot"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "RoadmapSnapshot_sessionId_createdAt_idx" ON "RoadmapSnapshot"("sessionId","createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterviewMockSession_companyId_fkey') THEN
    ALTER TABLE "InterviewMockSession" ADD CONSTRAINT "InterviewMockSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewRound_sessionId_fkey') THEN
    ALTER TABLE "MockInterviewRound" ADD CONSTRAINT "MockInterviewRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewMockSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewQuestion_sessionId_fkey') THEN
    ALTER TABLE "MockInterviewQuestion" ADD CONSTRAINT "MockInterviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewMockSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewQuestion_roundId_fkey') THEN
    ALTER TABLE "MockInterviewQuestion" ADD CONSTRAINT "MockInterviewQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MockInterviewRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterviewAnswer_userId_fkey') THEN
    ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterviewAnswer_sessionId_fkey') THEN
    ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewMockSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterviewAnswer_roundId_fkey') THEN
    ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MockInterviewRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterviewAnswer_questionId_fkey') THEN
    ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "MockInterviewQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterviewEvaluation_sessionId_fkey') THEN
    ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewMockSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReadinessSnapshot_userId_fkey') THEN
    ALTER TABLE "ReadinessSnapshot" ADD CONSTRAINT "ReadinessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReadinessSnapshot_sessionId_fkey') THEN
    ALTER TABLE "ReadinessSnapshot" ADD CONSTRAINT "ReadinessSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewMockSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoadmapSnapshot_userId_fkey') THEN
    ALTER TABLE "RoadmapSnapshot" ADD CONSTRAINT "RoadmapSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoadmapSnapshot_sessionId_fkey') THEN
    ALTER TABLE "RoadmapSnapshot" ADD CONSTRAINT "RoadmapSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewMockSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
