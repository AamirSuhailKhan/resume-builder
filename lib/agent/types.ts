/**
 * lib/agent/types.ts
 *
 * Canonical TypeScript types for the CareerOS Autonomous Career Agent.
 * Defines shapes for goals, memories, planning steps, execution tools,
 * roadmaps, progress tracking, and notifications.
 */

export type AgentAutonomyMode = "manual" | "assisted" | "autonomous";

export interface AgentGoal {
  id: string;
  userId: string;
  rawInput: string;
  targetRole: string;
  targetCompany?: string;
  timelineMonths: number;
  salaryTarget?: {
    base: number;
    currency: string;
  };
  createdAt: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  timeframeWeeks: number; // e.g. weeks 1-4, weeks 5-8
  dependencies: string[]; // Milestone IDs
  status: "pending" | "active" | "completed";
  progressPct: number;
}

export interface GoalTask {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  type: "skill_acquisition" | "project_build" | "certification" | "networking" | "application" | "interview_prep";
  metadata: Record<string, any>;
  status: "todo" | "in_progress" | "completed";
  dueDate?: string;
}

export interface GoalDecomposition {
  goalId: string;
  targetRole: string;
  targetCompany?: string;
  timelineWeeks: number;
  milestones: GoalMilestone[];
  tasks: GoalTask[];
}

export interface CareerRoadmapPhase {
  phaseNumber: number;
  title: string;
  focus: string;
  weeks: number[];
  milestones: string[];
  weeklyPlans: {
    weekNumber: number;
    focus: string;
    objectives: string[];
    actionItems: {
      id: string;
      title: string;
      description: string;
      type: GoalTask["type"];
      estimatedHours: number;
      completed: boolean;
    }[];
  }[];
}

export interface CareerRoadmap {
  id: string;
  userId: string;
  goalId: string;
  targetRole: string;
  targetCompany?: string;
  timelineWeeks: number;
  phases: CareerRoadmapPhase[];
  skillsToAcquire: {
    skill: string;
    priority: "high" | "medium" | "low";
    currentLevel: number;
    targetLevel: number;
    resources: string[];
  }[];
  certificationsSuggested: {
    name: string;
    issuer: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    estimatedWeeks: number;
    url?: string;
  }[];
  projectsRecommended: {
    title: string;
    description: string;
    techStack: string[];
    difficulty: string;
    expectedImpact: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemoryItem {
  id: string;
  type: string;
  title: string;
  content: string;
  importance: number;
  confidence: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AgentWorkingMemory {
  userId: string;
  currentGoal?: AgentGoal;
  decomposition?: GoalDecomposition;
  roadmap?: CareerRoadmap;
  profileSummary?: string;
  currentSkills: string[];
  missingSkills: string[];
  recentApplications: any[];
  recentInterviews: any[];
  logs: string[];
}

export type AgentToolType =
  | "analyze_profile"
  | "analyze_missing_skills"
  | "generate_roadmap"
  | "suggest_certifications"
  | "recommend_projects"
  | "suggest_networking_targets"
  | "recommend_jobs"
  | "dispatch_notifications";

export interface AgentToolDefinition {
  name: AgentToolType;
  description: string;
  parameters: Record<string, any>;
}

export interface AgentToolResult {
  toolName: AgentToolType;
  success: boolean;
  output: any;
  error?: string;
}

export interface AgentPlanStep {
  stepNumber: number;
  reasoning: string;
  toolToExecute: AgentToolType;
  parameters: Record<string, any>;
  status: "planned" | "executing" | "completed" | "failed";
  result?: any;
}

export interface AgentExecutionReport {
  userId: string;
  goalInput: string;
  steps: AgentPlanStep[];
  workingMemory: Partial<AgentWorkingMemory>;
  completedAt: string;
}

export interface WeeklyProgressReport {
  weekNumber: number;
  completedTasksCount: number;
  totalTasksCount: number;
  skillsGained: string[];
  applicationsSubmitted: number;
  interviewsCompleted: number;
  feedbackSummary: string;
}

export interface WeeklyAdaptationReport {
  userId: string;
  roadmapId: string;
  originalWeekNumber: number;
  adaptationWeekNumber: number;
  completedObjectives: string[];
  missedObjectives: string[];
  gainedSkills: string[];
  reasonsForChange: string[];
  adjustmentsMade: {
    type: "add_task" | "remove_task" | "reschedule_task" | "adjust_skill_priority";
    description: string;
    details: any;
  }[];
  newWeeklyPlans: CareerRoadmapPhase["weeklyPlans"];
  updatedAt: string;
}
