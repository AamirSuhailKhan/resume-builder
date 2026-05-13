/*
  Warnings:

  - The `status` column on the `BrowserExecution` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stepId` column on the `DOMAction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."BrowserExecutionStatus" AS ENUM ('queued', 'booting', 'navigating', 'authenticating', 'waiting_for_selector', 'filling_form', 'waiting_for_approval', 'captcha_required', 'uploading_resume', 'submitting', 'completed', 'failed', 'canceled', 'timed_out');

-- AlterTable
ALTER TABLE "public"."BrowserExecution" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentTitle" TEXT,
ADD COLUMN     "currentUrl" TEXT,
ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."BrowserExecutionStatus" NOT NULL DEFAULT 'queued';

-- AlterTable
ALTER TABLE "public"."BrowserSession" ALTER COLUMN "storageState" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."DOMAction" ADD COLUMN     "compressedSnapshot" BYTEA,
ADD COLUMN     "parentActionId" UUID,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "stepId",
ADD COLUMN     "stepId" UUID;

-- CreateTable
CREATE TABLE "public"."WorkerHeartbeat" (
    "id" UUID NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerType" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BrowserLease" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "browserSessionId" UUID,
    "contextId" TEXT NOT NULL,
    "leasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "BrowserLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExecutionReasoning" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "alternatives" JSONB,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionReasoning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerHeartbeat_workerId_key" ON "public"."WorkerHeartbeat"("workerId");

-- CreateIndex
CREATE INDEX "WorkerHeartbeat_workerType_lastSeenAt_idx" ON "public"."WorkerHeartbeat"("workerType", "lastSeenAt");

-- CreateIndex
CREATE INDEX "BrowserLease_executionId_idx" ON "public"."BrowserLease"("executionId");

-- CreateIndex
CREATE INDEX "BrowserLease_status_idx" ON "public"."BrowserLease"("status");

-- CreateIndex
CREATE INDEX "ExecutionReasoning_executionId_createdAt_idx" ON "public"."ExecutionReasoning"("executionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionReasoning_workflowId_createdAt_idx" ON "public"."ExecutionReasoning"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "BrowserExecution_status_createdAt_idx" ON "public"."BrowserExecution"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."BrowserLease" ADD CONSTRAINT "BrowserLease_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."BrowserExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrowserLease" ADD CONSTRAINT "BrowserLease_browserSessionId_fkey" FOREIGN KEY ("browserSessionId") REFERENCES "public"."BrowserSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
