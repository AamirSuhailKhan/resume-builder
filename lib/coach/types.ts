export type ApplicationStatus = "applied" | "interview" | "rejected" | "offer";

export type CoachMessageRole = "user" | "assistant" | "system";

export interface StoredCoachMessage {
  id: string;
  role: CoachMessageRole;
  content: string;
  createdAt: string;
}

export interface RejectionPatternAnalysis {
  totalApplications: number;
  rejectedCount: number;
  rejectionRate: number;
  rejectionsLast30Days: number;
  topRejectedCompanies: Array<{ company: string; count: number }>;
  topRejectedRoles: Array<{ role: string; count: number }>;
  avgDaysToRejection: number | null;
  patternSummary: string;
  likelyCauses: string[];
}

export interface ResumeAbTestResult {
  resumeId: string;
  resumeTitle: string;
  version: number;
  applications: number;
  interviews: number;
  offers: number;
  rejections: number;
  interviewRate: number;
  isWinner: boolean;
}

export interface CollegeTierResult {
  tier: "tier1" | "tier2" | "tier3" | "unknown";
  schools: string[];
  summary: string;
}

export interface MockInterviewMetadata {
  role?: string;
  company?: string;
  phase: "setup" | "questioning" | "debrief";
  questionIndex: number;
  scores: Array<{ question: string; score: number; feedback: string }>;
  companyContext?: string;
}

export interface CoachSessionContext {
  mode: string;
  metadata: MockInterviewMetadata | null;
}

export interface ApplicationSnapshot {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  matchScore: number;
  resumeId: string | null;
  appliedAt: Date | null;
  updatedAt: Date;
}
