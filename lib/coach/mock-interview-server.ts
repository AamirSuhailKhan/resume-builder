import "server-only";
import type { MockInterviewMetadata } from "@/lib/coach/types";
import { CompanyIntelligenceService } from "@/lib/services/company-intelligence.service";

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
