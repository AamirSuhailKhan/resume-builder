import { z } from "zod";

export const queueName = "resumeai-jobs";

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

export const jobPayloadSchemas = {
  autosave: autosavePayloadSchema,
  ats_analysis: atsAnalysisPayloadSchema,
  ai_rewrite: aiRewritePayloadSchema,
  export_pdf: exportPdfPayloadSchema,
  ai_job_intelligence: aiJobIntelligencePayloadSchema,
  ai_auto_apply: aiAutoApplyPayloadSchema,
  ai_portfolio: aiPortfolioPayloadSchema,
} as const;

export type ResumeAiJobName = keyof typeof jobPayloadSchemas;
export type AutosavePayload = z.infer<typeof autosavePayloadSchema>;
export type AtsAnalysisPayload = z.infer<typeof atsAnalysisPayloadSchema>;
export type AiRewritePayload = z.infer<typeof aiRewritePayloadSchema>;
export type ExportPdfPayload = z.infer<typeof exportPdfPayloadSchema>;
export type AiJobIntelligencePayload = z.infer<typeof aiJobIntelligencePayloadSchema>;
export type AiAutoApplyPayload = z.infer<typeof aiAutoApplyPayloadSchema>;
export type AiPortfolioPayload = z.infer<typeof aiPortfolioPayloadSchema>;

export type ResumeAiJobPayloadMap = {
  autosave: AutosavePayload;
  ats_analysis: AtsAnalysisPayload;
  ai_rewrite: AiRewritePayload;
  export_pdf: ExportPdfPayload;
  ai_job_intelligence: AiJobIntelligencePayload;
  ai_auto_apply: AiAutoApplyPayload;
  ai_portfolio: AiPortfolioPayload;
};

export type ResumeAiJobPayload = ResumeAiJobPayloadMap[ResumeAiJobName];
