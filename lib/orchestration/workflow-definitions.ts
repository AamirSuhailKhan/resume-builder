import { DEFAULT_RETRY_POLICY } from "./policies";
import { WorkflowGraphDefinition, WorkflowType } from "./types";

const baseApprovalRetry = {
  maxAttempts: 1,
  retryableErrors: [],
};

export const workflowDefinitions: Record<WorkflowType, WorkflowGraphDefinition> = {
  resume_optimization: {
    type: "resume_optimization",
    version: 1,
    name: "Resume Optimization",
    description: "Retrieve memory, optimize resume artifacts, and request approval for diffs.",
    defaultRetry: DEFAULT_RETRY_POLICY,
    steps: [
      { id: "plan", kind: "agent", name: "Plan optimization", agentType: "planner" },
      {
        id: "optimize_resume",
        kind: "agent",
        name: "Optimize resume",
        agentType: "resume_optimizer",
        dependsOn: ["plan"],
      },
      {
        id: "approval_resume_diff",
        kind: "approval",
        name: "Approve resume diff",
        dependsOn: ["optimize_resume"],
        retry: baseApprovalRetry,
        approval: {
          type: "resume_variant",
          title: "Approve resume optimization",
          summary: "Review generated resume changes before using them in an application.",
          required: true,
          riskFlags: { factualAccuracy: true },
        },
      },
    ],
  },
  job_matching: {
    type: "job_matching",
    version: 1,
    name: "Job Matching",
    description: "Rank jobs, summarize fit, and emit next best actions.",
    defaultRetry: DEFAULT_RETRY_POLICY,
    steps: [
      { id: "plan", kind: "agent", name: "Plan job search", agentType: "planner" },
      {
        id: "rank_jobs",
        kind: "agent",
        name: "Rank opportunities",
        agentType: "job_matcher",
        dependsOn: ["plan"],
        input: { limit: 10, minScore: 0 },
      },
      {
        id: "coach_next_action",
        kind: "agent",
        name: "Coach next action",
        agentType: "career_coach",
        dependsOn: ["rank_jobs"],
      },
    ],
  },
  auto_apply: {
    type: "auto_apply",
    version: 1,
    name: "Auto Apply Co-pilot",
    description: "Prepare packet, pause for approval, then hand off to browser automation.",
    defaultRetry: DEFAULT_RETRY_POLICY,
    steps: [
      { id: "plan", kind: "agent", name: "Plan application", agentType: "planner" },
      {
        id: "rank_jobs",
        kind: "agent",
        name: "Select best jobs",
        agentType: "job_matcher",
        dependsOn: ["plan"],
        input: { limit: 5, minScore: 70 },
      },
      {
        id: "prepare_resume",
        kind: "agent",
        name: "Prepare resume packet",
        agentType: "resume_optimizer",
        dependsOn: ["rank_jobs"],
      },
      {
        id: "browser_apply",
        kind: "agent",
        name: "Browser application co-pilot",
        agentType: "browser_apply",
        dependsOn: ["prepare_resume"],
      },
      {
        id: "follow_up_plan",
        kind: "agent",
        name: "Plan follow up",
        agentType: "follow_up",
        dependsOn: ["browser_apply"],
      },
    ],
  },
  recruiter_outreach: {
    type: "recruiter_outreach",
    version: 1,
    name: "Recruiter Outreach",
    description: "Draft outreach with memory and pause before sending.",
    defaultRetry: DEFAULT_RETRY_POLICY,
    steps: [
      { id: "plan", kind: "agent", name: "Plan outreach", agentType: "planner" },
      {
        id: "draft_outreach",
        kind: "agent",
        name: "Draft outreach",
        agentType: "recruiter_communicator",
        dependsOn: ["plan"],
      },
      {
        id: "follow_up_plan",
        kind: "agent",
        name: "Follow-up strategy",
        agentType: "follow_up",
        dependsOn: ["draft_outreach"],
      },
    ],
  },
  interview_prep: {
    type: "interview_prep",
    version: 1,
    name: "Interview Prep",
    description: "Generate interview prep plan and weak-signal drills.",
    defaultRetry: DEFAULT_RETRY_POLICY,
    steps: [
      { id: "plan", kind: "agent", name: "Plan prep", agentType: "planner" },
      {
        id: "prep_pack",
        kind: "agent",
        name: "Generate prep pack",
        agentType: "interview_prep",
        dependsOn: ["plan"],
      },
    ],
  },
  career_coaching: {
    type: "career_coaching",
    version: 1,
    name: "Career Coaching",
    description: "Analyze memory and outcomes to recommend next best actions.",
    defaultRetry: DEFAULT_RETRY_POLICY,
    steps: [
      { id: "plan", kind: "agent", name: "Plan coaching", agentType: "planner" },
      {
        id: "coach",
        kind: "agent",
        name: "Generate coaching plan",
        agentType: "career_coach",
        dependsOn: ["plan"],
      },
      {
        id: "analytics",
        kind: "agent",
        name: "Record analytics",
        agentType: "analytics",
        dependsOn: ["coach"],
      },
    ],
  },
};

export function getWorkflowDefinition(type: WorkflowType) {
  return workflowDefinitions[type];
}
