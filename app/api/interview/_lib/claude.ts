/**
 * app/api/interview/_lib/claude.ts
 * ───────────────────────────────────────────────────────────
 * Thin adapter that exposes the original callClaudeJson() signature
 * used by all interview routes, now delegating to the centralized
 * lib/ai/core.ts execution layer.
 *
 * This preserves full backwards compatibility with existing callers
 * (generate, evaluate, wellbeing, skill-gap, negotiation, etc.)
 * while benefiting from:
 *   - Centralized retry + back-off
 *   - Unified truncation detection
 *   - Shared JSON repair + fallback system
 *   - Production-safe observability
 * ───────────────────────────────────────────────────────────
 */

import { executeAI } from "@/lib/ai/core";
import { safeParseAIJson } from "@/lib/ai/recovery";

export const INTERVIEW_MODEL = "claude-sonnet-4-20250514";

// ─── Primitive helpers (kept for callers that import them) ────

export function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseClaudeJson(text: string): unknown {
  return safeParseAIJson(text, null);
}

// ─── Deterministic mock generator (sandbox mode) ─────────────

function getDeterministicMockJson(system: string, user: string): unknown {
  const prompt = (system + " " + user).toLowerCase();

  if (
    prompt.includes("generate targeted interview") ||
    prompt.includes("interview question") ||
    prompt.includes('"questions"')
  ) {
    return {
      questions: [
        {
          id: "q1",
          type: "behavioral",
          question:
            "Tell me about a time you designed a high-throughput pipeline and had to trade write latency for consistency.",
          signal:
            "Evaluates CAP theorem understanding, database isolation levels, and message queue design.",
          followUp: "How would your design scale if write volume tripled overnight?",
        },
        {
          id: "q2",
          type: "system-design",
          question:
            "Design an idempotent API gateway that handles 50k req/s with strict audit logging.",
          signal:
            "Evaluates distributed locking, database schema partitioning, and stateless load balancing.",
          followUp: "How do you guarantee idempotency during a network partition?",
        },
        {
          id: "q3",
          type: "technical",
          question:
            "Debug a memory leak in a Next.js production server under high concurrency.",
          signal:
            "Evaluates Node.js heap profiling, GC metrics, and stream consumption.",
          followUp: "What dashboard signals would first alert you to this leak?",
        },
      ],
    };
  }

  if (
    prompt.includes("strict but constructive interview evaluator") ||
    prompt.includes('"rubric"')
  ) {
    return {
      score: 82,
      summary:
        "Strong engineering depth. Add concrete scale metrics and clearer personal ownership.",
      strengths: [
        "Excellent STAR structure.",
        "Clear trade-off analysis between vertical scaling and read replicas.",
        "Concise, professional communication.",
      ],
      improvements: [
        "Include specific QPS numbers.",
        "Isolate personal contribution from team effort.",
      ],
      nextDrill:
        "Practice idempotent API system-design questions under 90 seconds using STAR.",
      rubric: [
        { metric: "Structure", score: 85, feedback: "Solid STAR layout." },
        { metric: "Specificity", score: 80, feedback: "Add precise QPS metrics." },
        { metric: "Role Fit", score: 84, feedback: "Shows technical maturity." },
        { metric: "Impact", score: 78, feedback: "Add quantitative business metrics." },
        { metric: "Communication", score: 83, feedback: "Clear and confident." },
      ],
    };
  }

  if (
    prompt.includes("extract required skills") ||
    prompt.includes('"requiredskills"') ||
    prompt.includes("learningpath")
  ) {
    return {
      requiredSkills: [
        { name: "Distributed Systems Design", confidence: "working", marketDemandScore: 9 },
        { name: "Database Partitioning", confidence: "basic", marketDemandScore: 8 },
        { name: "Kubernetes", confidence: "strong", marketDemandScore: 7 },
        { name: "Next.js", confidence: "strong", marketDemandScore: 9 },
      ],
      gapSkills: [
        { name: "Distributed Consensus (Raft)", confidence: "missing", marketDemandScore: 8 },
        { name: "Redis Caching", confidence: "missing", marketDemandScore: 7 },
      ],
      learningPath: [
        {
          week: 1,
          skill: "Redis Caching Patterns",
          resource: {
            title: "Redis University — Caching Course",
            url: "https://university.redis.com/courses/ru101/",
            type: "video",
            durationHours: 6,
            platform: "Redis",
          },
          milestone: "Implement write-through and read-through caching.",
          projectIdea: "Build a caching middleware with rate-limiting.",
        },
      ],
      estimatedWeeks: 4,
    };
  }

  if (
    prompt.includes("negotiation") ||
    prompt.includes("walkawaynumber") ||
    prompt.includes("counteroffers")
  ) {
    return {
      marketAnalysis: { min: 1200000, max: 4800000, median: 2800000, percentile: 65 },
      leverage: ["Strong match for distributed systems.", "Premium packages for senior hires."],
      risks: ["Aggressive anchors may lengthen validation loops."],
      counterOffers: {
        conservative: {
          amount: 2200000,
          script: "I'd feel most comfortable at INR 22,00,000.",
          emailDraft: "Could we adjust base to INR 22,00,000?",
        },
        standard: {
          amount: 2500000,
          script: "INR 25,00,000 aligns with senior market benchmarks.",
          emailDraft: "Could we refine the base to INR 25,00,000?",
        },
        aggressive: {
          amount: 2800000,
          script: "I'd accept today at INR 28,00,000.",
          emailDraft: "Would you be open to INR 28,00,000? I'd sign immediately.",
        },
      },
      walkawayNumber: 2000000,
      timing: "Initiate negotiation within 24 hours of the written offer.",
      redFlags: ["Back your experience with specifics.", "Keep negotiation focused on value."],
    };
  }

  if (
    prompt.includes("career trajectories") ||
    prompt.includes("trajectorypaths") ||
    prompt.includes("verdict")
  ) {
    return {
      trajectoryPaths: [
        {
          path: "optimistic",
          probability: 0.35,
          avgTimeYears: 1.5,
          nextRoles: ["Lead AI Architect", "Principal Engineer"],
          salaryGrowthPct: 45,
          likelihood: "medium",
        },
        {
          path: "realistic",
          probability: 0.5,
          avgTimeYears: 3,
          nextRoles: ["Senior SDE", "Tech Lead"],
          salaryGrowthPct: 25,
          likelihood: "high",
        },
      ],
      careerAlignScore: 88,
      alignRationale:
        "Role perfectly leverages your Next.js and distributed systems background.",
      riskFactors: ["AI Platform requirements may scale faster than onboarding."],
      opportunities: ["Work on frontier LLM serving infrastructure."],
      skillsGained: ["Speculative decoding serving", "High-performance caching"],
      skillsMissing: ["Distributed consensus (Raft)"],
      verdict: "strong_yes",
    };
  }

  // Generic wellness / coach response
  return {
    message:
      "Focus on one high-yield action — refining a key tradeoff or drafting a follow-up email — to create real momentum. What single micro-task should we focus on next?",
    milestones: [],
  };
}

// ─── Main callClaudeJson (now delegates to core) ─────────────

export async function callClaudeJson<T>({
  system,
  user,
  maxTokens = 2048,
  model,
}: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<{ data: T; usage: { input_tokens?: number; output_tokens?: number } | undefined }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const isMockKey = !apiKey || apiKey === "xxx" || apiKey.startsWith("mock");

  if (isMockKey) {
    console.warn(
      "[callClaudeJson] ANTHROPIC_API_KEY is placeholder — using local sandbox."
    );
    const mockData = getDeterministicMockJson(system, user) as T;
    return { data: mockData, usage: { input_tokens: 10, output_tokens: 100 } };
  }

  const result = await executeAI<T>({
    system,
    user,
    maxTokens,
    model: model ?? INTERVIEW_MODEL,
    provider: "anthropic",
    fallback: getDeterministicMockJson(system, user) as T,
    maxRetries: 1,
  });

  return {
    data: result.data,
    usage: {
      input_tokens: result.meta.inputTokens,
      output_tokens: result.meta.outputTokens,
    },
  };
}
