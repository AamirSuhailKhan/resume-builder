import type {
  AiAutoApplyPayload,
  AiJobIntelligencePayload,
  AiPortfolioPayload,
  AiRewritePayload,
  AtsAnalysisPayload,
  AutosavePayload,
  ExportPdfPayload,
} from "@/lib/queue/types";

export type ATSJobPayload = AtsAnalysisPayload;
export type AnalyticsJobPayload = AiJobIntelligencePayload;
export type CleanupJobPayload = {
  jobRecordId: string;
  retentionCutoff: string;
  dryRun?: boolean;
};
export type JobSyncPayload = {
  jobRecordId: string;
  userId: string;
  query: string;
  location?: string;
  limit?: number;
};

export type QueuePayloadRegistry = {
  autosave: AutosavePayload;
  ats_analysis: ATSJobPayload;
  ai_rewrite: AiRewritePayload;
  export_pdf: ExportPdfPayload;
  ai_job_intelligence: AnalyticsJobPayload;
  ai_auto_apply: AiAutoApplyPayload;
  ai_portfolio: AiPortfolioPayload;
  cleanup: CleanupJobPayload;
  job_sync: JobSyncPayload;
};
