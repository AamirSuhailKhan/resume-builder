import type { MockInterviewMetadata } from "@/lib/coach/types";
import { CompanyIntelligenceService } from "@/lib/services/company-intelligence.service";

export const DEFAULT_MOCK_METADATA: MockInterviewMetadata = {
  phase: "setup",
  questionIndex: 0,
  scores: [],
};

export function parseMockMetadata(raw: unknown): MockInterviewMetadata | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const phase = obj.phase;
  if (phase !== "setup" && phase !== "questioning" && phase !== "debrief") return null;

  const meta: MockInterviewMetadata = {
    phase,
    questionIndex: typeof obj.questionIndex === "number" ? obj.questionIndex : 0,
    scores: Array.isArray(obj.scores)
      ? (obj.scores as MockInterviewMetadata["scores"])
      : [],
  };
  if (typeof obj.role === "string") meta.role = obj.role;
  if (typeof obj.company === "string") meta.company = obj.company;
  if (typeof obj.companyContext === "string") meta.companyContext = obj.companyContext;
  return meta;
}

export async function enrichMockMetadataWithCompany(
  metadata: MockInterviewMetadata
): Promise<MockInterviewMetadata> {
  if (!metadata.company || metadata.companyContext) return metadata;

  try {
    const intel = await CompanyIntelligenceService.generateReport(metadata.company);
    const interview = intel.interviewProcess as Record<string, unknown> | null;
    const parts = [
      `Company: ${metadata.company}`,
      intel.glassdoorRating ? `Glassdoor-style rating signal: ${intel.glassdoorRating}/5` : null,
      interview?.format ? `Interview format: ${interview.format}` : null,
      interview?.rounds ? `Typical rounds: ${interview.rounds}` : null,
      interview?.difficulty ? `Difficulty: ${interview.difficulty}` : null,
    ].filter(Boolean);

    return { ...metadata, companyContext: parts.join("\n") };
  } catch {
    return metadata;
  }
}

const META_REGEX = /<!--coach-meta:(\{[\s\S]*?\})-->/;

export function parseCoachMetaFromAssistant(text: string): Partial<MockInterviewMetadata> | null {
  const match = text.match(META_REGEX);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as Partial<MockInterviewMetadata>;
  } catch {
    return null;
  }
}

export function stripCoachMeta(text: string): string {
  return text.replace(META_REGEX, "").trim();
}

export function mergeMockMetadata(
  current: MockInterviewMetadata,
  update: Partial<MockInterviewMetadata>
): MockInterviewMetadata {
  return {
    ...current,
    ...update,
    scores: update.scores ?? current.scores,
  };
}

export function detectMockInterviewIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("mock interview") ||
    lower.includes("interview me") ||
    lower.includes("simulate an interview") ||
    lower.includes("practice interview")
  );
}
