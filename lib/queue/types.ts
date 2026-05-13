import { z } from "zod";

export const queueNames = {
  atsAnalysis: "resumeai-ats-analysis",   // HIGH priority  — user-facing
  jobSync: "resumeai-job-sync",           // MEDIUM priority — background
  analytics: "resumeai-analytics",        // LOW priority   — background
  cleanup: "resumeai-cleanup",            // LOW priority   — maintenance
  email: "resumeai-email",               // MEDIUM priority — transactional
  default: "resumeai-jobs",              // MEDIUM priority — catch-all
} as const;

/**
 * BullMQ priority values: lower number = higher priority
 * 1 = highest, 10 = lowest
 */
export const queuePriorities: Record<keyof typeof queueNames, number> = {
  atsAnalysis: 1,
  email: 3,
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

export const jobPayloadSchemas = {
  autosave: autosavePayloadSchema,
  ats_analysis: atsAnalysisPayloadSchema,
  ai_rewrite: aiRewritePayloadSchema,
  export_pdf: exportPdfPayloadSchema,
  ai_job_intelligence: aiJobIntelligencePayloadSchema,
  ai_auto_apply: aiAutoApplyPayloadSchema,
  ai_portfolio: aiPortfolioPayloadSchema,
  email_drip: emailDripPayloadSchema,
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

export type ResumeAiJobPayloadMap = {
  autosave: AutosavePayload;
  ats_analysis: AtsAnalysisPayload;
  ai_rewrite: AiRewritePayload;
  export_pdf: ExportPdfPayload;
  ai_job_intelligence: AiJobIntelligencePayload;
  ai_auto_apply: AiAutoApplyPayload;
  ai_portfolio: AiPortfolioPayload;
  email_drip: EmailDripPayload;
};

export type ResumeAiJobPayload = ResumeAiJobPayloadMap[ResumeAiJobName];
