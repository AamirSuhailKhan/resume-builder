-- CreateTable
CREATE TABLE "public"."BrowserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "storageState" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BrowserExecution" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "contextId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExecutionScreenshot" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DOMAction" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "stepId" TEXT,
    "actionType" TEXT NOT NULL,
    "selector" TEXT,
    "value" TEXT,
    "url" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DOMAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExecutionReplay" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "artifactsUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionReplay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrowserSession_userId_idx" ON "public"."BrowserSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrowserSession_userId_domain_key" ON "public"."BrowserSession"("userId", "domain");

-- CreateIndex
CREATE INDEX "BrowserExecution_workflowId_idx" ON "public"."BrowserExecution"("workflowId");

-- CreateIndex
CREATE INDEX "BrowserExecution_userId_idx" ON "public"."BrowserExecution"("userId");

-- CreateIndex
CREATE INDEX "ExecutionScreenshot_executionId_idx" ON "public"."ExecutionScreenshot"("executionId");

-- CreateIndex
CREATE INDEX "ExecutionScreenshot_workflowId_createdAt_idx" ON "public"."ExecutionScreenshot"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "DOMAction_executionId_idx" ON "public"."DOMAction"("executionId");

-- CreateIndex
CREATE INDEX "DOMAction_workflowId_createdAt_idx" ON "public"."DOMAction"("workflowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionReplay_workflowId_key" ON "public"."ExecutionReplay"("workflowId");

-- AddForeignKey
ALTER TABLE "public"."BrowserSession" ADD CONSTRAINT "BrowserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrowserExecution" ADD CONSTRAINT "BrowserExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExecutionReplay" ADD CONSTRAINT "ExecutionReplay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
