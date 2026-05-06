ALTER TYPE "QueueJobType" ADD VALUE IF NOT EXISTS 'ai_job_intelligence';
ALTER TYPE "QueueJobType" ADD VALUE IF NOT EXISTS 'ai_auto_apply';
ALTER TYPE "QueueJobType" ADD VALUE IF NOT EXISTS 'ai_portfolio';

CREATE TYPE "ApplicationStatus" AS ENUM ('applied', 'interview', 'rejected', 'offer');

CREATE TABLE "job_opportunities" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "location" TEXT,
  "salaryRange" TEXT,
  "description" TEXT NOT NULL,
  "matchScore" INTEGER NOT NULL DEFAULT 0,
  "parsed" JSONB,
  "sourceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "resumeId" UUID,
  "jobOpportunityId" UUID,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
  "matchScore" INTEGER NOT NULL DEFAULT 0,
  "generatedResume" TEXT,
  "coverLetter" TEXT,
  "emailDraft" TEXT,
  "notes" TEXT,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "company" TEXT,
  "role" TEXT,
  "questions" JSONB NOT NULL,
  "answers" JSONB NOT NULL,
  "feedback" JSONB,
  "score" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_opportunities_userId_matchScore_idx" ON "job_opportunities"("userId", "matchScore");
CREATE INDEX "job_opportunities_userId_createdAt_idx" ON "job_opportunities"("userId", "createdAt");
CREATE INDEX "Application_userId_status_idx" ON "Application"("userId", "status");
CREATE INDEX "Application_resumeId_createdAt_idx" ON "Application"("resumeId", "createdAt");
CREATE INDEX "Application_jobOpportunityId_idx" ON "Application"("jobOpportunityId");
CREATE INDEX "InterviewSession_userId_createdAt_idx" ON "InterviewSession"("userId", "createdAt");

ALTER TABLE "job_opportunities" ADD CONSTRAINT "job_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "job_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
