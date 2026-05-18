import { describe, expect, it } from "vitest";
import type { Application } from "@prisma/client";
import { analyzeRejectionPatterns } from "@/lib/coach/rejection-patterns";

function app(partial: Partial<Application>): Application {
  return {
    id: "1",
    userId: "u1",
    resumeId: null,
    jobOpportunityId: null,
    company: "Acme",
    role: "Engineer",
    status: "applied",
    matchScore: 50,
    generatedResume: null,
    coverLetter: null,
    emailDraft: null,
    notes: null,
    appliedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as Application;
}

describe("analyzeRejectionPatterns", () => {
  it("returns empty-state summary with no applications", () => {
    const result = analyzeRejectionPatterns([]);
    expect(result.rejectedCount).toBe(0);
    expect(result.patternSummary).toContain("Not enough");
  });

  it("computes rejection rate", () => {
    const apps = [
      app({ status: "rejected", company: "A" }),
      app({ status: "rejected", company: "B" }),
      app({ status: "interview", company: "C" }),
      app({ status: "applied", company: "D" }),
    ];
    const result = analyzeRejectionPatterns(apps);
    expect(result.rejectedCount).toBe(2);
    expect(result.rejectionRate).toBe(0.5);
  });
});
