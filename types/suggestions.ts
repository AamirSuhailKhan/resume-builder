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
}
