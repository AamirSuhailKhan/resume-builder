import { prisma } from "@/lib/db/prisma";
import { metrics } from "@/lib/metrics";
import {
  JsonObject,
  MemoryRetrievalIntent,
  RetrievedMemory,
  WorkflowType,
} from "./types";

const INTENT_TYPES: Record<MemoryRetrievalIntent, string[]> = {
  planning: ["preference", "goal", "constraint", "outcome_pattern", "weakness"],
  resume: ["achievement", "skill", "style", "weakness", "outcome_pattern"],
  job_matching: ["preference", "skill", "goal", "constraint", "outcome_pattern"],
  auto_apply: ["preference", "form_answer", "constraint", "style", "salary"],
  recruiter_outreach: ["style", "relationship", "achievement", "preference", "outcome_pattern"],
  interview: ["achievement", "weakness", "interview_performance", "skill", "goal"],
  coaching: ["goal", "weakness", "outcome_pattern", "preference", "skill"],
};

export class MemoryRetriever {
  static intentForWorkflow(type: WorkflowType): MemoryRetrievalIntent {
    switch (type) {
      case "resume_optimization":
        return "resume";
      case "job_matching":
        return "job_matching";
      case "auto_apply":
        return "auto_apply";
      case "recruiter_outreach":
        return "recruiter_outreach";
      case "interview_prep":
        return "interview";
      case "career_coaching":
        return "coaching";
      default:
        return "planning";
    }
  }

  static async retrieve(params: {
    userId: string;
    intent: MemoryRetrievalIntent;
    query?: string | undefined;
    limit?: number | undefined;
    input?: JsonObject | undefined;
  }): Promise<RetrievedMemory[]> {
    const startedAt = Date.now();
    const memoryTypes = INTENT_TYPES[params.intent];
    const limit = Math.min(params.limit ?? 12, 30);
    const queryTerms = tokenize([
      params.query,
      params.input ? JSON.stringify(params.input) : undefined,
    ].filter(Boolean).join(" "));

    const memories = await prisma.careerMemory.findMany({
      where: {
        userId: params.userId,
        OR: [
          { type: { in: memoryTypes } },
          { visibility: { in: ["user_visible", "agent_visible"] } },
        ],
      },
      orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
      take: 80,
    });

    const ranked = memories
      .map((memory) => {
        const lexicalScore = scoreText(`${memory.title} ${memory.content}`, queryTerms);
        const typeBoost = memoryTypes.includes(memory.type) ? 0.25 : 0;
        const confidenceBoost = memory.confidence * 0.35;
        return {
          id: memory.id,
          type: memory.type,
          title: memory.title,
          content: memory.content,
          confidence: memory.confidence,
          source: memory.source,
          evidenceRef: memory.evidenceRef,
          score: lexicalScore + typeBoost + confidenceBoost,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    metrics.timing("orchestration.memory.retrieve_ms", Date.now() - startedAt, {
      intent: params.intent,
      count: ranked.length,
    });

    return ranked;
  }

  static compress(memories: RetrievedMemory[], tokenBudget = 1400) {
    const maxChars = tokenBudget * 4;
    const lines: string[] = [];
    let used = 0;

    for (const memory of memories) {
      const line = `[${memory.type}:${Math.round(memory.confidence * 100)}%] ${memory.title}: ${memory.content}`;
      if (used + line.length > maxChars) break;
      lines.push(line);
      used += line.length;
    }

    return lines.join("\n");
  }
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2)
  );
}

function scoreText(text: string, terms: Set<string>) {
  if (terms.size === 0) return 0;
  const target = text.toLowerCase();
  let matches = 0;
  for (const term of terms) {
    if (target.includes(term)) matches++;
  }
  return matches / terms.size;
}
