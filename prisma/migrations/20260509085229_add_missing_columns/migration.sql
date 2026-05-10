-- CreateEnum
CREATE TYPE "public"."DataSourceType" AS ENUM ('verified', 'estimated', 'ai_inferred');

-- AlterTable
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken");

-- DropIndex
DROP INDEX "public"."Session_sessionToken_key";

-- AlterTable
ALTER TABLE "public"."job_opportunities" ADD COLUMN     "sourceType" "public"."DataSourceType" NOT NULL DEFAULT 'verified';

-- CreateTable
CREATE TABLE "public"."AIUsage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QueueEvent" (
    "id" UUID NOT NULL,
    "bullJobId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" UUID,
    "durationMs" INTEGER,
    "error" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProviderEvent" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsInserted" INTEGER NOT NULL DEFAULT 0,
    "jobsSkipped" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ATSScoreHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "jobTitle" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ATSScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsentRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataExportRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeletionRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsSnapshot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "applicationsCount" INTEGER NOT NULL DEFAULT 0,
    "interviewsCount" INTEGER NOT NULL DEFAULT 0,
    "offersCount" INTEGER NOT NULL DEFAULT 0,
    "avgAtsScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobsIngested" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeatureFlag" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "rolloutPct" INTEGER NOT NULL DEFAULT 100,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdempotencyKey" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "resultRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIUsage_userId_createdAt_idx" ON "public"."AIUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "public"."AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "public"."AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "QueueEvent_bullJobId_idx" ON "public"."QueueEvent"("bullJobId");

-- CreateIndex
CREATE INDEX "QueueEvent_queue_status_createdAt_idx" ON "public"."QueueEvent"("queue", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderEvent_provider_createdAt_idx" ON "public"."ProviderEvent"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderEvent_success_createdAt_idx" ON "public"."ProviderEvent"("success", "createdAt");

-- CreateIndex
CREATE INDEX "ATSScoreHistory_resumeId_createdAt_idx" ON "public"."ATSScoreHistory"("resumeId", "createdAt");

-- CreateIndex
CREATE INDEX "ATSScoreHistory_userId_createdAt_idx" ON "public"."ATSScoreHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_consentType_idx" ON "public"."ConsentRecord"("userId", "consentType");

-- CreateIndex
CREATE INDEX "DataExportRequest_userId_requestedAt_idx" ON "public"."DataExportRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "DeletionRequest_userId_idx" ON "public"."DeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "DeletionRequest_status_scheduledAt_idx" ON "public"."DeletionRequest"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_userId_date_idx" ON "public"."AnalyticsSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_userId_date_key" ON "public"."AnalyticsSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "public"."FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "public"."FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "public"."IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_key_idx" ON "public"."IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_userId_operation_idx" ON "public"."IdempotencyKey"("userId", "operation");

-- AddForeignKey
ALTER TABLE "public"."AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
