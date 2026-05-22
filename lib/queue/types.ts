import { z } from "zod";

export const queueNames = {
  atsAnalysis: "resumeai-ats-analysis",
  jobSync: "resumeai-job-sync",
  interviewIntel: "resumeai-interview-intel",
  analytics: "resumeai-analytics",
  cleanup: "resumeai-cleanup",
  email: "resumeai-email",
  default: "resumeai-jobs",
} as const;

export const queuePriorities: Record<keyof typeof queueNames, number> = {
  atsAnalysis: 1,
  email: 3,
  interviewIntel: 4,
  jobSync: 5,
  default: 5,
  analytics: 8,
  cleanup: 10,
};

export const autosavePayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  resumeId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  title: z.string().min(1).max(160),
  expectedUpdatedAt: z.string().datetime().optional(),
  createVersion: z.boolean().default(false),
});

export const atsAnalysisPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  resumeId: z.string().uuid(),
});

export const aiRewritePayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  resumeId: z.string().uuid(),
  instruction: z.string().max(2000).optional(),
});

export const exportPdfPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  resumeId: z.string().uuid(),
  template: z.enum(["modern", "minimal", "professional"]).default("modern"),
});

export const aiJobIntelligencePayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  jobDescription: z.string().min(40).max(20000),
});

export const aiAutoApplyPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
  jobOpportunityId: z.string().uuid().optional(),
  preview: z.string().max(30000).optional(),
});

export const aiPortfolioPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
  theme: z.enum(["editorial", "studio", "operator"]).default("editorial"),
});

export const emailDripPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
  emailDraftId: z.string().uuid(),
  campaignId: z.string().uuid(),
});

export const computeAnalyticsPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const interviewIngestPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  sourceType: z.enum([
    "leetcode",
    "geeksforgeeks",
    "reddit",
    "glassdoor",
    "blind",
    "github",
    "hackerrank",
    "interviewbit",
    "user_submission",
    "company_seed",
    "ai_inferred",
  ]),
  sourceUrl: z.string().url().optional(),
  rawText: z.string().min(20).max(100000).optional(),
  companyName: z.string().max(120).optional(),
  roleTitle: z.string().max(160).optional(),
});

export const interviewNormalizePayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  artifactId: z.string().uuid(),
});

export const interviewEmbedPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export const interviewSolutionPayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export const interviewModeratePayloadSchema = z.object({
  jobRecordId: z.string().uuid(),
  contributionId: z.string().uuid(),
});

export const jobPayloadSchemas = {
  autosave: autosavePayloadSchema,
  ats_analysis: atsAnalysisPayloadSchema,
  ai_rewrite: aiRewritePayloadSchema,
  export_pdf: exportPdfPayloadSchema,
  ai_job_intelligence: aiJobIntelligencePayloadSchema,
  ai_auto_apply: aiAutoApplyPayloadSchema,
  ai_portfolio: aiPortfolioPayloadSchema,
  email_drip: emailDripPayloadSchema,
  compute_analytics: computeAnalyticsPayloadSchema,
  interview_ingest: interviewIngestPayloadSchema,
  interview_normalize: interviewNormalizePayloadSchema,
  interview_embed: interviewEmbedPayloadSchema,
  interview_solution: interviewSolutionPayloadSchema,
  interview_moderate: interviewModeratePayloadSchema,
} as const;

export type ResumeAiJobName = keyof typeof jobPayloadSchemas;
export type AutosavePayload = z.infer<typeof autosavePayloadSchema>;
export type AtsAnalysisPayload = z.infer<typeof atsAnalysisPayloadSchema>;
export type AiRewritePayload = z.infer<typeof aiRewritePayloadSchema>;
export type ExportPdfPayload = z.infer<typeof exportPdfPayloadSchema>;
export type AiJobIntelligencePayload = z.infer<typeof aiJobIntelligencePayloadSchema>;
export type AiAutoApplyPayload = z.infer<typeof aiAutoApplyPayloadSchema>;
export type AiPortfolioPayload = z.infer<typeof aiPortfolioPayloadSchema>;
export type EmailDripPayload = z.infer<typeof emailDripPayloadSchema>;
export type ComputeAnalyticsPayload = z.infer<typeof computeAnalyticsPayloadSchema>;
export type InterviewIngestPayload = z.infer<typeof interviewIngestPayloadSchema>;
export type InterviewNormalizePayload = z.infer<typeof interviewNormalizePayloadSchema>;
export type InterviewEmbedPayload = z.infer<typeof interviewEmbedPayloadSchema>;
export type InterviewSolutionPayload = z.infer<typeof interviewSolutionPayloadSchema>;
export type InterviewModeratePayload = z.infer<typeof interviewModeratePayloadSchema>;

export type ResumeAiJobPayloadMap = {
  autosave: AutosavePayload;
  ats_analysis: AtsAnalysisPayload;
  ai_rewrite: AiRewritePayload;
  export_pdf: ExportPdfPayload;
  ai_job_intelligence: AiJobIntelligencePayload;
  ai_auto_apply: AiAutoApplyPayload;
  ai_portfolio: AiPortfolioPayload;
  email_drip: EmailDripPayload;
  compute_analytics: ComputeAnalyticsPayload;
  interview_ingest: InterviewIngestPayload;
  interview_normalize: InterviewNormalizePayload;
  interview_embed: InterviewEmbedPayload;
  interview_solution: InterviewSolutionPayload;
  interview_moderate: InterviewModeratePayload;
};

export type ResumeAiJobPayload = ResumeAiJobPayloadMap[ResumeAiJobName];
