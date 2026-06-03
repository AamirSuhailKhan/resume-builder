/**
 * career-graph/types.ts
 *
 * Canonical type definitions for the Career Graph Engine.
 * The graph is a directed, labeled property graph where nodes are
 * career entities and edges are typed relationships.
 */

// ─── Node Kind Enum ──────────────────────────────────────────────────────────

export const GraphNodeKind = {
  SKILL: "SKILL",
  EXPERIENCE: "EXPERIENCE",
  PROJECT: "PROJECT",
  CERTIFICATION: "CERTIFICATION",
  EDUCATION: "EDUCATION",
  APPLICATION: "APPLICATION",
  INTERVIEW: "INTERVIEW",
  COMPANY: "COMPANY",
  RECRUITER: "RECRUITER",
  CAREER_GOAL: "CAREER_GOAL",
  SALARY_TARGET: "SALARY_TARGET",
  JOB_MATCH: "JOB_MATCH",
  SKILL_GAP: "SKILL_GAP",
  OFFER: "OFFER",
} as const;

export type GraphNodeKind = (typeof GraphNodeKind)[keyof typeof GraphNodeKind];

// ─── Edge Kind Enum ───────────────────────────────────────────────────────────

export const GraphEdgeKind = {
  // Skill relationships
  HAS_SKILL: "HAS_SKILL",
  REQUIRES_SKILL: "REQUIRES_SKILL",
  FILLS_GAP: "FILLS_GAP",
  VALIDATES_SKILL: "VALIDATES_SKILL",

  // Experience & Projects
  WORKED_AT: "WORKED_AT",
  BUILT: "BUILT",
  USED_IN: "USED_IN",

  // Applications
  APPLIED_TO: "APPLIED_TO",
  TARGETED_BY: "TARGETED_BY",
  MATCHED_TO: "MATCHED_TO",

  // Interview lifecycle
  INTERVIEWED_AT: "INTERVIEWED_AT",
  LED_BY: "LED_BY",
  FOLLOWED_APPLICATION: "FOLLOWED_APPLICATION",

  // Offers
  RECEIVED_OFFER: "RECEIVED_OFFER",
  OFFERED_BY: "OFFERED_BY",

  // Goals
  TARGETS_ROLE: "TARGETS_ROLE",
  TARGETS_COMPANY: "TARGETS_COMPANY",
  TARGETS_SALARY: "TARGETS_SALARY",

  // Certifications & Education
  EARNED: "EARNED",
  STUDIED_AT: "STUDIED_AT",

  // Recruiter
  CONTACTED_BY: "CONTACTED_BY",
  RECRUITS_FOR: "RECRUITS_FOR",
} as const;

export type GraphEdgeKind = (typeof GraphEdgeKind)[keyof typeof GraphEdgeKind];

// ─── Node Payloads ────────────────────────────────────────────────────────────

export interface SkillNode {
  name: string;
  category: string;
  proficiencyLevel: number; // 0–1
  yearsOfExperience: number;
  lastUsed: string | null;
  marketDemand: number; // 0–1
  isVerified: boolean;
  sources: string[]; // "resume" | "certification" | "project" | "interview"
}

export interface ExperienceNode {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  description: string;
  achievements: string[];
  teamSize: number | null;
  skills: string[];
}

export interface ProjectNode {
  name: string;
  description: string;
  techStack: string[];
  url: string | null;
  impact: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CertificationNode {
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string | null;
  credentialId: string | null;
  skills: string[];
  verificationUrl: string | null;
}

export interface EducationNode {
  institution: string;
  degree: string;
  field: string;
  gpa: number | null;
  startYear: number;
  endYear: number | null;
  achievements: string[];
}

export interface ApplicationNode {
  company: string;
  role: string;
  status: "applied" | "interview" | "offer" | "rejected";
  appliedAt: string;
  source: string | null;
  matchScore: number;
  jobOpportunityId: string | null;
}

export interface InterviewNode {
  company: string;
  role: string;
  roundType: string;
  scheduledAt: string;
  completedAt: string | null;
  outcome: "passed" | "failed" | "pending" | "cancelled";
  feedback: string | null;
  score: number | null;
}

export interface CompanyNode {
  name: string;
  domain: string | null;
  industry: string | null;
  tier: string | null;
  hiringStatus: string;
  trustScore: number;
}

export interface RecruiterNode {
  name: string;
  company: string;
  email: string | null;
  linkedinUrl: string | null;
  responseRate: number;
  trustScore: number;
}

export interface CareerGoalNode {
  targetRole: string;
  targetCompany: string | null;
  targetIndustry: string | null;
  timeline: string | null;
  priority: number;
  status: "active" | "achieved" | "abandoned";
}

export interface SalaryTargetNode {
  targetBase: number;
  targetTotal: number;
  currency: string;
  timeline: string | null;
  marketMin: number | null;
  marketMax: number | null;
  marketMedian: number | null;
}

export interface JobMatchNode {
  jobOpportunityId: string;
  company: string;
  role: string;
  matchScore: number;
  matchedAt: string;
  missingSkills: string[];
  matchedSkills: string[];
}

export interface SkillGapNode {
  skill: string;
  targetRole: string;
  currentLevel: number;
  requiredLevel: number;
  priority: number;
  marketDemand: number;
  estimatedWeeks: number;
  status: "open" | "in_progress" | "closed";
}

export interface OfferNode {
  company: string;
  role: string;
  baseAmount: number;
  totalCtc: number;
  currency: string;
  receivedAt: string;
  expiresAt: string | null;
  status: "pending" | "accepted" | "rejected" | "negotiating";
}

// ─── Union Payloads ───────────────────────────────────────────────────────────

export type GraphNodePayload =
  | SkillNode
  | ExperienceNode
  | ProjectNode
  | CertificationNode
  | EducationNode
  | ApplicationNode
  | InterviewNode
  | CompanyNode
  | RecruiterNode
  | CareerGoalNode
  | SalaryTargetNode
  | JobMatchNode
  | SkillGapNode
  | OfferNode;

// ─── Core Graph Primitives ────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  userId: string;
  kind: GraphNodeKind;
  label: string;
  payload: GraphNodePayload;
  weight: number; // 0–1 importance score
  confidence: number; // 0–1 data confidence
  sourceEntityId: string | null; // FK back to originating table
  sourceEntityType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: GraphEdgeKind;
  weight: number; // relationship strength 0–1
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Graph Output Formats ─────────────────────────────────────────────────────

export interface CareerGraph {
  userId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  computedAt: string;
  version: number;
}

export interface GraphSummary {
  totalNodes: number;
  nodesByKind: Record<GraphNodeKind, number>;
  totalEdges: number;
  edgesByKind: Record<GraphEdgeKind, number>;
  completenessScore: number; // 0–100
  lastUpdated: string;
}

export interface GraphDiff {
  addedNodes: GraphNode[];
  removedNodes: string[];
  updatedNodes: Array<{ id: string; changes: Partial<GraphNode> }>;
  addedEdges: GraphEdge[];
  removedEdges: string[];
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface CareerGraphAnalytics {
  skillCloud: Array<{ skill: string; weight: number; demand: number; gap: boolean }>;
  applicationFunnel: {
    saved: number;
    applied: number;
    interview: number;
    offer: number;
    conversionRates: { toInterview: number; toOffer: number };
  };
  salaryProgression: Array<{ date: string; amount: number; type: "offer" | "target" | "market" }>;
  skillGapHeatmap: Array<{ skill: string; current: number; required: number; priority: number }>;
  careerVelocity: {
    applicationsPerWeek: number;
    interviewsPerMonth: number;
    offersReceived: number;
    trend: "accelerating" | "steady" | "slowing";
  };
  networkStrength: {
    totalRecruiters: number;
    activeCompanies: number;
    avgRecruiterTrustScore: number;
  };
  goalProgress: Array<{
    goal: string;
    progress: number;
    status: string;
  }>;
}

// ─── Graph Update Triggers ────────────────────────────────────────────────────

export type GraphUpdateTrigger =
  | { type: "RESUME_UPLOADED"; payload: { resumeId: string } }
  | { type: "RESUME_EDITED"; payload: { resumeId: string; fields: string[] } }
  | { type: "JOB_SAVED"; payload: { jobOpportunityId: string } }
  | { type: "JOB_APPLIED"; payload: { applicationId: string } }
  | { type: "INTERVIEW_COMPLETED"; payload: { sessionId: string; outcome: string } }
  | { type: "SKILL_ADDED"; payload: { skill: string; source: string } }
  | { type: "CERTIFICATION_ADDED"; payload: { certificationData: CertificationNode } }
  | { type: "OFFER_RECEIVED"; payload: { offerData: OfferNode } };
