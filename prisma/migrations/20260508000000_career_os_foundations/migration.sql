CREATE TYPE "WorkflowStatus" AS ENUM (
  'draft',
  'planned',
  'waiting_for_data',
  'waiting_for_approval',
  'queued',
  'running',
  'blocked',
  'retrying',
  'completed',
  'failed',
  'canceled'
);

CREATE TYPE "AgentRunStatus" AS ENUM (
  'planned',
  'queued',
  'running',
  'waiting_for_approval',
  'completed',
  'failed',
  'canceled'
);

CREATE TYPE "ApprovalStatus" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired',
  'canceled'
);

CREATE TABLE "CareerProfile" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "headline" TEXT,
  "summary" TEXT,
  "goals" JSONB,
  "preferences" JSONB,
  "constraints" JSONB,
  "salaryExpectation" JSONB,
  "autonomyPolicy" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerMemory" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "evidenceRef" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "source" TEXT NOT NULL DEFAULT 'user',
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "metadata" JSONB,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowRun" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
  "goal" TEXT NOT NULL,
  "plan" JSONB,
  "policy" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentRun" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "workflowId" UUID,
  "agentType" TEXT NOT NULL,
  "status" "AgentRunStatus" NOT NULL DEFAULT 'planned',
  "input" JSONB,
  "output" JSONB,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tokenUsage" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentStep" (
  "id" UUID NOT NULL,
  "agentRunId" UUID NOT NULL,
  "stepType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalRequest" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "workflowId" UUID,
  "type" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "riskFlags" JSONB,
  "decision" JSONB,
  "expiresAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationArtifact" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "applicationId" UUID,
  "resumeId" UUID,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'agent',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowEvent" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "workflowId" UUID,
  "agentRunId" UUID,
  "stepId" UUID,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'internal',
  "payload" JSONB NOT NULL,
  "traceId" TEXT NOT NULL,
  "sequence" BIGSERIAL NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerProfile_userId_key" ON "CareerProfile"("userId");
CREATE INDEX "CareerProfile_userId_idx" ON "CareerProfile"("userId");
CREATE INDEX "CareerMemory_userId_type_idx" ON "CareerMemory"("userId", "type");
CREATE INDEX "CareerMemory_userId_createdAt_idx" ON "CareerMemory"("userId", "createdAt");
CREATE INDEX "WorkflowRun_userId_status_createdAt_idx" ON "WorkflowRun"("userId", "status", "createdAt");
CREATE INDEX "WorkflowRun_type_status_idx" ON "WorkflowRun"("type", "status");
CREATE INDEX "AgentRun_userId_status_createdAt_idx" ON "AgentRun"("userId", "status", "createdAt");
CREATE INDEX "AgentRun_workflowId_createdAt_idx" ON "AgentRun"("workflowId", "createdAt");
CREATE INDEX "AgentRun_agentType_status_idx" ON "AgentRun"("agentType", "status");
CREATE INDEX "AgentStep_agentRunId_createdAt_idx" ON "AgentStep"("agentRunId", "createdAt");
CREATE INDEX "AgentStep_stepType_status_idx" ON "AgentStep"("stepType", "status");
CREATE INDEX "ApprovalRequest_userId_status_createdAt_idx" ON "ApprovalRequest"("userId", "status", "createdAt");
CREATE INDEX "ApprovalRequest_workflowId_status_idx" ON "ApprovalRequest"("workflowId", "status");
CREATE INDEX "ApplicationArtifact_userId_type_createdAt_idx" ON "ApplicationArtifact"("userId", "type", "createdAt");
CREATE INDEX "ApplicationArtifact_applicationId_idx" ON "ApplicationArtifact"("applicationId");
CREATE INDEX "ApplicationArtifact_resumeId_createdAt_idx" ON "ApplicationArtifact"("resumeId", "createdAt");
CREATE INDEX "WorkflowEvent_userId_createdAt_idx" ON "WorkflowEvent"("userId", "createdAt");
CREATE INDEX "WorkflowEvent_workflowId_sequence_idx" ON "WorkflowEvent"("workflowId", "sequence");
CREATE INDEX "WorkflowEvent_traceId_idx" ON "WorkflowEvent"("traceId");
CREATE INDEX "WorkflowEvent_type_createdAt_idx" ON "WorkflowEvent"("type", "createdAt");

ALTER TABLE "CareerProfile" ADD CONSTRAINT "CareerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerMemory" ADD CONSTRAINT "CareerMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationArtifact" ADD CONSTRAINT "ApplicationArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationArtifact" ADD CONSTRAINT "ApplicationArtifact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationArtifact" ADD CONSTRAINT "ApplicationArtifact_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
