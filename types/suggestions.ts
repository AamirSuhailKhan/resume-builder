import type { ResumeData } from "@/lib/storage";

export const suggestionStatuses = ["pending", "accepted", "rejected", "edited"] as const;
export const suggestionSections = ["summary", "experience", "education", "skills", "personal", "other"] as const;

export type SuggestionStatus = (typeof suggestionStatuses)[number];
export type SuggestionSection = (typeof suggestionSections)[number];

export interface ResumeSuggestion {
  id: string;
  resumeId?: string;
  section: SuggestionSection;
  path: string;
  original: string;
  suggested: string;
  rationale: string;
  impact?: string;
  confidence?: number;
  scoreDelta?: number;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeIntelligenceData {
  callbackProbability: {
    before: number;
    after: number;
  };
  dimensions: {
    technicalDepth: { before: number; after: number; feedback: string };
    achievementFraming: { before: number; after: number; feedback: string };
    atsCompatibility: { before: number; after: number; feedback: string };
    recruiterPsychology: { before: number; after: number; feedback: string };
    marketCompetitiveness: { before: number; after: number; feedback: string };
  };
  weaknesses: Array<{
    id: string;
    issue: string;
    severity: "critical" | "moderate" | "low";
    section: string;
    recommendation: string;
  }>;
  recruiterScannability: {
    scanTimeSeconds: number;
    readabilityScore: number;
    topTakeaways: string[];
    criticalFrictionPoints: string[];
  };
  indiaMarketFit: {
    tierMatch: "Tier 1 Product" | "Tier 2 Product" | "Service/Consulting" | "Early-Stage Startup";
    targetMatchPercentage: number;
    skillsGap: string[];
    recommendedSteps: string[];
  };
}

export interface SuggestionSession {
  id: string;
  resumeId?: string;
  source: "api" | "optimizer" | "local";
  createdAt: string;
  updatedAt: string;
  jobDescription?: string;
  resumeSnapshot: ResumeData;
  suggestions: ResumeSuggestion[];
  scores?: {
    before: number;
    after: number;
  };
  persisted?: boolean;
  intelligence?: ResumeIntelligenceData;
}
