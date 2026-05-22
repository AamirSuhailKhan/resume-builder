import { createHash } from "crypto";
import type {
  InterviewDifficulty,
  InterviewQuestionKind,
  InterviewRoundType,
} from "@prisma/client";

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stableHash(value: string) {
  return createHash("sha256").update(normalizeText(value)).digest("hex");
}

export function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function inferQuestionKind(text: string): InterviewQuestionKind {
  const value = normalizeText(text);
  if (/leadership|conflict|ownership|failure|team|pressure|ambiguity|tell me about/.test(value)) return "behavioral";
  if (/design|scale|architecture|capacity|distributed|url shortener|payment gateway|feed|notification/.test(value)) return "system_design";
  if (/class|object oriented|parking lot|splitwise|machine coding|lld/.test(value)) return "lld";
  if (/sql|query|join|index/.test(value)) return "sql";
  if (/os|process|thread|deadlock|memory/.test(value)) return "os";
  if (/network|tcp|udp|http|dns/.test(value)) return "networking";
  if (/ml|model|llm|embedding|ai|rag/.test(value)) return "ml_ai";
  if (/aptitude|percentage|profit|loss|puzzle/.test(value)) return value.includes("puzzle") ? "puzzle" : "aptitude";
  if (/mcq|multiple choice|assessment/.test(value)) return "oa_mcq";
  return "dsa";
}

export function inferDifficulty(text: string): InterviewDifficulty {
  const value = normalizeText(text);
  if (/hard|expert|senior|staff|distributed|scale to|million|billion|dp|dynamic programming|graph/.test(value)) return "hard";
  if (/easy|basic|fresher|ninja|aptitude/.test(value)) return "easy";
  if (/medium|sde2|backend|machine coding|system design/.test(value)) return "medium";
  return "unknown";
}

export function inferRoundType(text: string): InterviewRoundType {
  const value = normalizeText(text);
  if (/online|oa|assessment|hackerrank|codility/.test(value)) return "online_assessment";
  if (/recruiter|screen/.test(value)) return "recruiter_screen";
  if (/machine coding/.test(value)) return "machine_coding";
  if (/system design|hld/.test(value)) return "system_design";
  if (/lld|low level/.test(value)) return "lld";
  if (/behavior|manager|leadership/.test(value)) return "behavioral";
  if (/hr/.test(value)) return "hr";
  if (/aptitude/.test(value)) return "aptitude";
  return "technical";
}

export function inferTopic(text: string) {
  const value = normalizeText(text);
  const topics = [
    ["Dynamic Programming", /dp|dynamic programming|subsequence|knapsack/],
    ["Graphs", /graph|bfs|dfs|dijkstra|topological|cycle/],
    ["Trees", /tree|binary search tree|trie|lca/],
    ["Arrays", /array|sliding window|two pointer|subarray/],
    ["Strings", /string|substring|palindrome|anagram/],
    ["System Design", /design|scale|architecture|distributed/],
    ["Machine Coding", /machine coding|parking lot|splitwise|cache|event bus/],
    ["SQL", /sql|join|query|index/],
    ["Behavioral", /leadership|conflict|ownership|failure|ambiguity/],
    ["Aptitude", /aptitude|profit|loss|percentage|ratio/],
  ] as const;
  return topics.find(([, pattern]) => pattern.test(value))?.[0] ?? "General";
}

export function scoreRecency(date?: Date | null) {
  if (!date) return 0.55;
  const days = Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
  return clamp(1 - days / 540, 0.2, 1);
}

export function splitQuestions(rawText: string) {
  return rawText
    .split(/\n+|(?:^|\s)(?:q\.?|question)\s*\d*[:.)-]/i)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 18 && entry.length <= 1200)
    .slice(0, 50);
}
