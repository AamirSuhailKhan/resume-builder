export type JobMatch = {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  match: number;
  stage: "hot" | "warm" | "watch";
  skills: string[];
  missing: string[];
};

export type ApplicationStage = "Applied" | "Interview" | "Rejected" | "Offer";

export type ApplicationRecord = {
  id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  owner: string;
  nextStep: string;
  score: number;
};

// Fake data removed for production hardening
export const jobMatches: JobMatch[] = [];
export const applications: ApplicationRecord[] = [];
export const analyticsTrend: any[] = [];
export const parsedJob = {
  skills: [],
  tools: [],
  experience: [],
  missing: [],
};
