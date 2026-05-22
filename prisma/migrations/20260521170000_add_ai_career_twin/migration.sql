CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "TwinAutonomyMode" AS ENUM ('manual', 'assisted', 'autonomous');
CREATE TYPE "TwinStatus" AS ENUM ('onboarding', 'learning', 'active', 'paused', 'archived');
CREATE TYPE "TwinMemoryType" AS ENUM (
  'resume',
  'project',
  'interview_answer',
  'recruiter_conversation',
  'application',
  'salary_negotiation',
  'skill',
  'feedback',
  'strength',
  'weakness',
  'learning_goal',
  'rejection_pattern',
  'emotional_state',
  'work_preference',
  'company_preference',
  'behavior_signal',
  'market_signal'
);
CREATE TYPE "TwinInsightCategory" AS ENUM (
  'identity',
  'behavior',
  'communication',
  'market',
  'interview',
  'negotiation',
  'wellbeing',
  'learning',
  'recruiter',
  'india_market',
  'safety'
);
CREATE TYPE "PredictionType" AS ENUM (
  'callback_probability',
  'interview_probability',
  'offer_probability',
  'salary_probability',
  'recruiter_response_probability',
  'ghosting_risk',
  'scam_risk',
  'burnout_risk',
  'skill_stagnation_risk',
  'career_ceiling_risk'
);
CREATE TYPE "TwinEventType" AS ENUM (
  'created',
  'evolved',
  'memory_added',
  'insight_created',
  'prediction_created',
  'simulation_created',
  'approval_requested',
  'action_executed',
  'privacy_changed',
  'export_requested',
  'delete_requested'
);

CREATE TABLE "CareerTwin" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "displayName" text NOT NULL DEFAULT 'AI Career Twin',
  "status" "TwinStatus" NOT NULL DEFAULT 'onboarding',
  "autonomyMode" "TwinAutonomyMode" NOT NULL DEFAULT 'manual',
  "professionalIdentity" jsonb NOT NULL DEFAULT '{}',
  "cognitiveProfile" jsonb NOT NULL DEFAULT '{}',
  "scores" jsonb NOT NULL DEFAULT '{}',
  "confidence" double precision NOT NULL DEFAULT 0.45,
  "strengths" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "weaknesses" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "bestFitRoles" jsonb NOT NULL DEFAULT '[]',
  "hiddenOpportunities" jsonb NOT NULL DEFAULT '[]',
  "salaryProjection" jsonb NOT NULL DEFAULT '{}',
  "activePlan" jsonb NOT NULL DEFAULT '{}',
  "privacyControls" jsonb NOT NULL DEFAULT '{}',
  "lastEvolvedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerTwin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TwinMemory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "type" "TwinMemoryType" NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "summary" text,
  "source" text NOT NULL DEFAULT 'agent',
  "evidenceRefs" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "semanticLinks" jsonb NOT NULL DEFAULT '[]',
  "importance" double precision NOT NULL DEFAULT 0.5,
  "confidence" double precision NOT NULL DEFAULT 0.7,
  "recencyWeight" double precision NOT NULL DEFAULT 1,
  "reinforcementCount" integer NOT NULL DEFAULT 0,
  "accessScope" text NOT NULL DEFAULT 'private',
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "decayAt" timestamp(3),
  "expiresAt" timestamp(3),
  "embedding" vector(1536),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwinMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TwinInsight" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "category" "TwinInsightCategory" NOT NULL,
  "title" text NOT NULL,
  "insight" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "actions" jsonb NOT NULL DEFAULT '[]',
  "confidence" double precision NOT NULL DEFAULT 0.65,
  "impactScore" double precision NOT NULL DEFAULT 0.5,
  "status" text NOT NULL DEFAULT 'active',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwinInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BehavioralProfile" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "introversionScore" double precision NOT NULL DEFAULT 0.5,
  "communicationConfidence" double precision NOT NULL DEFAULT 0.5,
  "negotiationAggressiveness" double precision NOT NULL DEFAULT 0.5,
  "applicationConsistency" double precision NOT NULL DEFAULT 0.5,
  "procrastinationRisk" double precision NOT NULL DEFAULT 0.3,
  "burnoutRisk" double precision NOT NULL DEFAULT 0.25,
  "interviewAnxiety" double precision NOT NULL DEFAULT 0.4,
  "learningDiscipline" double precision NOT NULL DEFAULT 0.5,
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "confidence" double precision NOT NULL DEFAULT 0.55,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BehavioralProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunicationProfile" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "tone" text NOT NULL DEFAULT 'clear',
  "clarityScore" double precision NOT NULL DEFAULT 0.6,
  "warmthScore" double precision NOT NULL DEFAULT 0.55,
  "brevityScore" double precision NOT NULL DEFAULT 0.55,
  "confidenceScore" double precision NOT NULL DEFAULT 0.5,
  "recruiterFit" jsonb NOT NULL DEFAULT '{}',
  "writingPatterns" jsonb NOT NULL DEFAULT '[]',
  "dos" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "donts" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "confidence" double precision NOT NULL DEFAULT 0.55,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerTrajectory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "currentRole" text,
  "targetRole" text,
  "seniority" text,
  "industry" text,
  "trajectory" jsonb NOT NULL DEFAULT '[]',
  "salaryTrajectory" jsonb NOT NULL DEFAULT '[]',
  "risks" jsonb NOT NULL DEFAULT '[]',
  "opportunities" jsonb NOT NULL DEFAULT '[]',
  "confidence" double precision NOT NULL DEFAULT 0.55,
  "validFrom" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerTrajectory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutcomePrediction" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "predictionType" "PredictionType" NOT NULL,
  "subjectType" text NOT NULL,
  "subjectId" text,
  "score" double precision NOT NULL,
  "confidence" double precision NOT NULL DEFAULT 0.6,
  "explanation" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "actions" jsonb NOT NULL DEFAULT '[]',
  "modelVersion" text NOT NULL DEFAULT 'heuristic-v1',
  "expiresAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutcomePrediction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmotionalState" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "confidence" double precision NOT NULL DEFAULT 0.5,
  "momentum" double precision NOT NULL DEFAULT 0.5,
  "anxiety" double precision NOT NULL DEFAULT 0.35,
  "burnout" double precision NOT NULL DEFAULT 0.25,
  "motivation" double precision NOT NULL DEFAULT 0.55,
  "rejectionFatigue" double precision NOT NULL DEFAULT 0.2,
  "note" text,
  "intervention" jsonb NOT NULL DEFAULT '{}',
  "observedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmotionalState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NegotiationPattern" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "role" text,
  "company" text,
  "currency" text NOT NULL DEFAULT 'INR',
  "anchorAmount" double precision,
  "finalAmount" double precision,
  "aggressiveness" double precision NOT NULL DEFAULT 0.5,
  "successScore" double precision NOT NULL DEFAULT 0.5,
  "tactics" jsonb NOT NULL DEFAULT '[]',
  "lessons" jsonb NOT NULL DEFAULT '[]',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NegotiationPattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningVelocity" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "skill" text NOT NULL,
  "currentLevel" double precision NOT NULL DEFAULT 0.2,
  "targetLevel" double precision NOT NULL DEFAULT 0.8,
  "weeklyProgress" double precision NOT NULL DEFAULT 0,
  "estimatedWeeks" integer NOT NULL DEFAULT 8,
  "learningStyle" text NOT NULL DEFAULT 'mixed',
  "evidence" jsonb NOT NULL DEFAULT '[]',
  "lastMeasuredAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningVelocity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecruiterInteraction" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "recruiterName" text,
  "company" text NOT NULL,
  "channel" text NOT NULL DEFAULT 'unknown',
  "role" text,
  "responseLatency" integer,
  "sentiment" text NOT NULL DEFAULT 'unknown',
  "responseQuality" double precision NOT NULL DEFAULT 0.5,
  "ghostingRisk" double precision NOT NULL DEFAULT 0.3,
  "trustScore" double precision NOT NULL DEFAULT 0.5,
  "compensationSignals" jsonb NOT NULL DEFAULT '{}',
  "notes" text,
  "occurredAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SkillGap" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "targetRole" text NOT NULL,
  "skill" text NOT NULL,
  "currentLevel" double precision NOT NULL DEFAULT 0.2,
  "requiredLevel" double precision NOT NULL DEFAULT 0.8,
  "marketDemand" double precision NOT NULL DEFAULT 0.5,
  "priority" double precision NOT NULL DEFAULT 0.5,
  "learningPlan" jsonb NOT NULL DEFAULT '[]',
  "status" text NOT NULL DEFAULT 'open',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerSimulation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "question" text NOT NULL,
  "scenario" jsonb NOT NULL DEFAULT '{}',
  "baseline" jsonb NOT NULL DEFAULT '{}',
  "projection" jsonb NOT NULL DEFAULT '{}',
  "confidenceIntervals" jsonb NOT NULL DEFAULT '{}',
  "uncertainty" jsonb NOT NULL DEFAULT '[]',
  "recommendation" text NOT NULL,
  "confidence" double precision NOT NULL DEFAULT 0.55,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerSimulation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TwinEvent" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "twinId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "type" "TwinEventType" NOT NULL,
  "source" text NOT NULL DEFAULT 'system',
  "summary" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "traceId" text NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwinEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerTwin_userId_key" ON "CareerTwin"("userId");
CREATE INDEX "CareerTwin_userId_status_idx" ON "CareerTwin"("userId", "status");
CREATE INDEX "CareerTwin_lastEvolvedAt_idx" ON "CareerTwin"("lastEvolvedAt");

CREATE INDEX "TwinMemory_userId_type_createdAt_idx" ON "TwinMemory"("userId", "type", "createdAt");
CREATE INDEX "TwinMemory_twinId_importance_idx" ON "TwinMemory"("twinId", "importance");
CREATE INDEX "TwinMemory_decayAt_idx" ON "TwinMemory"("decayAt");
CREATE INDEX "TwinMemory_embedding_hnsw_idx" ON "TwinMemory" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "TwinInsight_userId_category_createdAt_idx" ON "TwinInsight"("userId", "category", "createdAt");
CREATE INDEX "TwinInsight_twinId_status_impactScore_idx" ON "TwinInsight"("twinId", "status", "impactScore");

CREATE UNIQUE INDEX "BehavioralProfile_twinId_key" ON "BehavioralProfile"("twinId");
CREATE UNIQUE INDEX "BehavioralProfile_userId_key" ON "BehavioralProfile"("userId");

CREATE UNIQUE INDEX "CommunicationProfile_twinId_key" ON "CommunicationProfile"("twinId");
CREATE UNIQUE INDEX "CommunicationProfile_userId_key" ON "CommunicationProfile"("userId");

CREATE INDEX "CareerTrajectory_userId_createdAt_idx" ON "CareerTrajectory"("userId", "createdAt");
CREATE INDEX "CareerTrajectory_twinId_validFrom_idx" ON "CareerTrajectory"("twinId", "validFrom");

CREATE INDEX "OutcomePrediction_userId_predictionType_createdAt_idx" ON "OutcomePrediction"("userId", "predictionType", "createdAt");
CREATE INDEX "OutcomePrediction_subjectType_subjectId_idx" ON "OutcomePrediction"("subjectType", "subjectId");

CREATE INDEX "EmotionalState_userId_observedAt_idx" ON "EmotionalState"("userId", "observedAt");
CREATE INDEX "EmotionalState_twinId_observedAt_idx" ON "EmotionalState"("twinId", "observedAt");

CREATE INDEX "NegotiationPattern_userId_createdAt_idx" ON "NegotiationPattern"("userId", "createdAt");

CREATE UNIQUE INDEX "LearningVelocity_userId_skill_key" ON "LearningVelocity"("userId", "skill");
CREATE INDEX "LearningVelocity_twinId_skill_idx" ON "LearningVelocity"("twinId", "skill");

CREATE INDEX "RecruiterInteraction_userId_company_occurredAt_idx" ON "RecruiterInteraction"("userId", "company", "occurredAt");
CREATE INDEX "RecruiterInteraction_trustScore_idx" ON "RecruiterInteraction"("trustScore");

CREATE UNIQUE INDEX "SkillGap_userId_targetRole_skill_key" ON "SkillGap"("userId", "targetRole", "skill");
CREATE INDEX "SkillGap_twinId_status_priority_idx" ON "SkillGap"("twinId", "status", "priority");

CREATE INDEX "CareerSimulation_userId_createdAt_idx" ON "CareerSimulation"("userId", "createdAt");

CREATE INDEX "TwinEvent_userId_createdAt_idx" ON "TwinEvent"("userId", "createdAt");
CREATE INDEX "TwinEvent_twinId_type_createdAt_idx" ON "TwinEvent"("twinId", "type", "createdAt");
CREATE INDEX "TwinEvent_traceId_idx" ON "TwinEvent"("traceId");

ALTER TABLE "CareerTwin" ADD CONSTRAINT "CareerTwin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinMemory" ADD CONSTRAINT "TwinMemory_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinMemory" ADD CONSTRAINT "TwinMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinInsight" ADD CONSTRAINT "TwinInsight_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinInsight" ADD CONSTRAINT "TwinInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehavioralProfile" ADD CONSTRAINT "BehavioralProfile_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehavioralProfile" ADD CONSTRAINT "BehavioralProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationProfile" ADD CONSTRAINT "CommunicationProfile_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationProfile" ADD CONSTRAINT "CommunicationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerTrajectory" ADD CONSTRAINT "CareerTrajectory_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerTrajectory" ADD CONSTRAINT "CareerTrajectory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutcomePrediction" ADD CONSTRAINT "OutcomePrediction_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutcomePrediction" ADD CONSTRAINT "OutcomePrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmotionalState" ADD CONSTRAINT "EmotionalState_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmotionalState" ADD CONSTRAINT "EmotionalState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NegotiationPattern" ADD CONSTRAINT "NegotiationPattern_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NegotiationPattern" ADD CONSTRAINT "NegotiationPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningVelocity" ADD CONSTRAINT "LearningVelocity_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningVelocity" ADD CONSTRAINT "LearningVelocity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruiterInteraction" ADD CONSTRAINT "RecruiterInteraction_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruiterInteraction" ADD CONSTRAINT "RecruiterInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerSimulation" ADD CONSTRAINT "CareerSimulation_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerSimulation" ADD CONSTRAINT "CareerSimulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinEvent" ADD CONSTRAINT "TwinEvent_twinId_fkey" FOREIGN KEY ("twinId") REFERENCES "CareerTwin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinEvent" ADD CONSTRAINT "TwinEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
