import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AIModelRouter } from "@/lib/ai/providers";
import { metrics } from "@/lib/metrics";
import { AgentBudget, TokenUsage, WorkflowType } from "./types";

export type ModelTask =
  | "plan"
  | "extract"
  | "rank"
  | "rewrite"
  | "outreach"
  | "approval_summary"
  | "interview"
  | "coaching";

export type ModelExecutionResult<T> = {
  data: T;
  provider: "gemini";
  modelTier: AgentBudget["modelTier"];
  estimatedCost: number;
  tokenUsage: TokenUsage;
};

const TASK_TIER: Record<ModelTask, AgentBudget["modelTier"]> = {
  plan: "premium",
  extract: "cheap",
  rank: "medium",
  rewrite: "premium",
  outreach: "premium",
  approval_summary: "cheap",
  interview: "medium",
  coaching: "medium",
};

export class OrchestrationModelRouter {
  static budgetFor(workflowType: WorkflowType, task: ModelTask): AgentBudget {
    const premiumWorkflows: WorkflowType[] = ["auto_apply", "recruiter_outreach", "resume_optimization"];
    const modelTier = premiumWorkflows.includes(workflowType) ? TASK_TIER[task] : downgrade(TASK_TIER[task]);

    return {
      modelTier,
      maxPromptTokens: modelTier === "premium" ? 12_000 : 6_000,
      maxCompletionTokens: modelTier === "premium" ? 4_000 : 1_500,
      maxCostUsd: modelTier === "premium" ? 0.25 : 0.05,
    };
  }

  static async execute<T>(params: {
    userId: string;
    workflowType: WorkflowType;
    task: ModelTask;
    prompt: string;
    schema?: z.ZodType<T>;
    budget?: AgentBudget;
  }): Promise<ModelExecutionResult<T>> {
    const startedAt = Date.now();
    const budget = params.budget ?? this.budgetFor(params.workflowType, params.task);
    const prompt = prunePrompt(params.prompt, budget.maxPromptTokens);

    const data = await AIModelRouter.executeTask<T>(
      prompt,
      {
        model: budget.modelTier,
        maxTokens: budget.maxCompletionTokens,
        temperature: params.task === "rewrite" || params.task === "outreach" ? 0.35 : 0.15,
      },
      params.schema
    );

    const tokenUsage = estimateTokens(prompt, data);
    const estimatedCost = estimateCost(budget.modelTier, tokenUsage);

    await prisma.aIUsage.create({
      data: {
        userId: params.userId,
        provider: "gemini",
        model: budget.modelTier,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        estimatedCost,
      },
    }).catch(() => undefined);

    metrics.timing("orchestration.model.latency_ms", Date.now() - startedAt, {
      task: params.task,
      tier: budget.modelTier,
    });
    metrics.gauge("orchestration.model.cost_usd", estimatedCost, {
      task: params.task,
      tier: budget.modelTier,
    });

    return {
      data,
      provider: "gemini",
      modelTier: budget.modelTier,
      estimatedCost,
      tokenUsage,
    };
  }
}

function downgrade(tier: AgentBudget["modelTier"]): AgentBudget["modelTier"] {
  if (tier === "premium") return "medium";
  if (tier === "medium") return "cheap";
  return "cheap";
}

function prunePrompt(prompt: string, maxPromptTokens: number) {
  const maxChars = maxPromptTokens * 4;
  if (prompt.length <= maxChars) return prompt;
  const head = prompt.slice(0, Math.floor(maxChars * 0.65));
  const tail = prompt.slice(prompt.length - Math.floor(maxChars * 0.3));
  return `${head}\n\n[...context pruned for token budget...]\n\n${tail}`;
}

function estimateTokens(prompt: string, data: unknown): TokenUsage {
  const completionText = typeof data === "string" ? data : JSON.stringify(data);
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(completionText.length / 4);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function estimateCost(tier: AgentBudget["modelTier"], usage: TokenUsage) {
  const perThousand = tier === "premium" ? 0.006 : tier === "medium" ? 0.002 : 0.0005;
  return Number(((usage.totalTokens / 1000) * perThousand).toFixed(6));
}
