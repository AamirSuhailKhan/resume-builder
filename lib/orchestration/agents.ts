import { z } from "zod";
import { BaseAgent } from "./base-agent";
import { AgentContext, AgentResult, JsonObject } from "./types";

const genericOutputSchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()).default([]),
  artifacts: z.array(z.record(z.string(), z.unknown())).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
}).passthrough();

type GenericAgentOutput = z.infer<typeof genericOutputSchema>;

class PlannerAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "planner" as const;
  readonly name = "Planner Agent";
  readonly description = "Plans durable workflow execution and identifies approval gates.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    return {
      summary: "Planned the workflow and prepared dependent agent steps.",
      output: {
        summary: "Plan ready",
        recommendations: [
          "Retrieve career memory before generation.",
          "Use human approval before external actions.",
          "Persist each artifact before browser or outreach execution.",
        ],
        artifacts: [{ workflowType: context.workflowType, stepId: context.step.id }],
        confidence: 0.86,
      },
    };
  }
}

class JobMatcherAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "job_matcher" as const;
  readonly name = "Job Matching Agent";
  readonly description = "Ranks opportunities using memory, preferences, and job intelligence.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    const result = await context.tools.call("jobs.top_matches", {
      limit: Number(context.input.limit ?? 10),
      minScore: Number(context.input.minScore ?? 0),
    });

    return {
      summary: "Loaded and ranked top opportunities for the user.",
      output: {
        summary: "Top opportunities ranked",
        recommendations: ["Prioritize roles with high match score and fresh posting signals."],
        artifacts: [result.output],
        confidence: 0.8,
      },
    };
  }
}

class ResumeOptimizerAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "resume_optimizer" as const;
  readonly name = "Resume Optimization Agent";
  readonly description = "Creates evidence-safe resume optimization plans and artifacts.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    const memorySummary = context.memory.slice(0, 5).map((memory) => memory.title);
    const artifact = await context.tools.call("application_artifact.create", {
      type: "resume_optimization_plan",
      title: "Evidence-backed resume optimization plan",
      content: {
        memoryUsed: memorySummary,
        instruction: context.input.instruction ?? "Tailor resume while preserving factual accuracy.",
        guardrails: ["No fabricated employers", "No invented metrics", "Diff must be approval-ready"],
      },
      metadata: {
        workflowId: context.workflowId,
        stepId: context.step.id,
      },
    });

    return {
      summary: "Prepared an evidence-backed resume optimization artifact.",
      output: {
        summary: "Resume optimization artifact created",
        recommendations: [
          "Generate changes as diffs.",
          "Require approval before using this variant in an application.",
        ],
        artifacts: [artifact.output],
        confidence: 0.78,
      },
    };
  }
}

class BrowserApplyAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "browser_apply" as const;
  readonly name = "Browser Apply Agent";
  readonly description = "Prepares browser automation, then pauses for human approval before submission.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    const approval = await context.requireApproval({
      type: "application_submit",
      title: "Approve application submission",
      summary: "The browser agent is ready to submit this application. Review the packet before any external action.",
      payload: {
        workflowId: context.workflowId,
        stepId: context.step.id,
        targetUrl: context.input.targetUrl ?? null,
        mode: "co_pilot",
      },
      riskFlags: {
        externalAction: true,
        requiresHumanReview: true,
      },
    });

    return {
      status: "waiting_for_approval",
      summary: "Paused before browser submission pending human approval.",
      approval,
      output: {
        summary: "Application submission paused",
        recommendations: ["Approve only after resume, cover letter, and form answers are verified."],
        artifacts: [{ approvalId: approval.approvalId }],
        confidence: 0.9,
      },
    };
  }
}

class RecruiterCommunicatorAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "recruiter_communicator" as const;
  readonly name = "Recruiter Communication Agent";
  readonly description = "Drafts recruiter outreach and pauses before sending.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    const approval = await context.requireApproval({
      type: "recruiter_message",
      title: "Approve recruiter outreach",
      summary: "Review this outreach before it is sent to a recruiter or employee.",
      payload: {
        draft: context.input.draft ?? "Draft pending generation",
        channel: context.input.channel ?? "email",
      },
      riskFlags: {
        externalMessage: true,
      },
    });

    return {
      status: "waiting_for_approval",
      summary: "Recruiter outreach is waiting for approval.",
      approval,
      output: {
        summary: "Outreach approval requested",
        recommendations: ["Personalize with one proof point and one clear ask."],
        artifacts: [{ approvalId: approval.approvalId }],
        confidence: 0.82,
      },
    };
  }
}

class InterviewPrepAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "interview_prep" as const;
  readonly name = "Interview Prep Agent";
  readonly description = "Builds interview prep plans from job, company, and user memory.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    return {
      summary: "Generated an interview prep plan.",
      output: {
        summary: "Interview prep ready",
        recommendations: [
          "Prepare three quantified STAR stories.",
          "Practice the weakest skill cluster from memory.",
          "Build a company-specific question list.",
        ],
        artifacts: [{ memoryCount: context.memory.length }],
        confidence: 0.76,
      },
    };
  }
}

class CareerCoachAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "career_coach" as const;
  readonly name = "Career Coach Agent";
  readonly description = "Turns outcomes and goals into next best actions.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    return {
      summary: "Generated career coaching recommendations.",
      output: {
        summary: "Career coaching plan ready",
        recommendations: [
          "Focus on roles where existing proof is strongest.",
          "Add missing evidence before increasing application volume.",
          "Use outcome labels to adjust weekly strategy.",
        ],
        artifacts: [{ input: sanitize(context.input) }],
        confidence: 0.74,
      },
    };
  }
}

class AnalyticsAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "analytics" as const;
  readonly name = "Analytics Agent";
  readonly description = "Analyzes workflow performance and emits learning signals.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(context: AgentContext): Promise<AgentResult<GenericAgentOutput>> {
    return {
      summary: "Recorded analytics signals for this workflow.",
      output: {
        summary: "Analytics recorded",
        recommendations: ["Track approval latency, application conversion, and agent cost."],
        artifacts: [{ workflowId: context.workflowId }],
        confidence: 0.7,
      },
    };
  }
}

class FollowUpAgent extends BaseAgent<GenericAgentOutput> {
  readonly type = "follow_up" as const;
  readonly name = "Follow-up Agent";
  readonly description = "Plans follow-ups after applications or outreach.";
  readonly outputSchema = genericOutputSchema;

  protected async execute(): Promise<AgentResult<GenericAgentOutput>> {
    return {
      summary: "Prepared follow-up timing and draft strategy.",
      output: {
        summary: "Follow-up plan ready",
        recommendations: ["Follow up after 4-7 business days if no recruiter response."],
        artifacts: [],
        confidence: 0.73,
      },
    };
  }
}

export const builtInAgents = [
  new PlannerAgent(),
  new JobMatcherAgent(),
  new ResumeOptimizerAgent(),
  new BrowserApplyAgent(),
  new RecruiterCommunicatorAgent(),
  new InterviewPrepAgent(),
  new CareerCoachAgent(),
  new AnalyticsAgent(),
  new FollowUpAgent(),
];

function sanitize(value: JsonObject) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !/password|token|secret/i.test(key))
  );
}
