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

export const jobMatches: JobMatch[] = [
  {
    id: "jm-1",
    company: "Vercel",
    role: "Senior Frontend Engineer",
    location: "Remote",
    salary: "$170k-$220k",
    match: 94,
    stage: "hot",
    skills: ["Next.js", "React", "Design Systems", "Performance"],
    missing: ["Edge Analytics"],
  },
  {
    id: "jm-2",
    company: "Linear",
    role: "Product Engineer",
    location: "San Francisco",
    salary: "$180k-$240k",
    match: 91,
    stage: "hot",
    skills: ["TypeScript", "UX Systems", "PostgreSQL"],
    missing: ["GraphQL"],
  },
  {
    id: "jm-3",
    company: "Stripe",
    role: "Dashboard Platform Engineer",
    location: "Hybrid",
    salary: "$190k-$255k",
    match: 88,
    stage: "warm",
    skills: ["React", "State Management", "Prisma", "Queues"],
    missing: ["Payments Domain"],
  },
  {
    id: "jm-4",
    company: "Notion",
    role: "AI Product Engineer",
    location: "New York",
    salary: "$165k-$225k",
    match: 84,
    stage: "warm",
    skills: ["AI UX", "Collaboration", "Editor UX"],
    missing: ["LLM evals"],
  },
];

export const applications: ApplicationRecord[] = [
  { id: "app-1", company: "Vercel", role: "Senior Frontend Engineer", stage: "Applied", owner: "You", nextStep: "Recruiter follow-up", score: 94 },
  { id: "app-2", company: "Linear", role: "Product Engineer", stage: "Interview", owner: "You", nextStep: "System design prep", score: 91 },
  { id: "app-3", company: "Stripe", role: "Dashboard Platform Engineer", stage: "Applied", owner: "You", nextStep: "Tailor portfolio case study", score: 88 },
  { id: "app-4", company: "Notion", role: "AI Product Engineer", stage: "Offer", owner: "You", nextStep: "Comp review", score: 84 },
  { id: "app-5", company: "Figma", role: "Design Systems Engineer", stage: "Rejected", owner: "You", nextStep: "Archive notes", score: 72 },
];

export const analyticsTrend = [
  { week: "W1", responseRate: 18, resumeScore: 67, interviews: 1 },
  { week: "W2", responseRate: 24, resumeScore: 72, interviews: 2 },
  { week: "W3", responseRate: 31, resumeScore: 79, interviews: 3 },
  { week: "W4", responseRate: 38, resumeScore: 86, interviews: 5 },
  { week: "W5", responseRate: 42, resumeScore: 89, interviews: 6 },
];

export const parsedJob = {
  skills: ["React", "Next.js", "TypeScript", "Accessibility", "Performance"],
  tools: ["Prisma", "PostgreSQL", "BullMQ", "Datadog", "Figma"],
  experience: ["5+ years frontend engineering", "Owns product-quality interfaces", "Cross-functional product judgement"],
  missing: ["GraphQL", "LLM evaluation workflows", "Payments domain"],
};
