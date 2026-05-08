import { mergeOptimizedResume } from "@/lib/ai";
import { normalizeResume } from "@/lib/normalizeResume";

const baseResume = normalizeResume({
  id: crypto.randomUUID(),
  personal: { name: "Test User" },
  experience: [
    { id: "exp-1", role: "Engineer", company: "Acme", points: "Worked on features" }
  ],
});

describe("mergeOptimizedResume", () => {
  it("replaces matching bullet point with improved version", () => {
    const result = mergeOptimizedResume(baseResume, {
      scores: { before: 40, after: 80 },
      tailored_package: { resume: "", cover_letter: "", email: "" },
      optimizations: [{ original: "Worked on features", improved: "Architected 3 core features", reason: "", impact: "" }],
      metrics_and_proof: { suggested_metrics: [], proof_suggestions: [] },
    });
    expect(result.experience.at(0)?.points).toBe("Architected 3 core features");
  });

  it("does not modify resume when no optimization matches", () => {
    const result = mergeOptimizedResume(baseResume, {
      scores: { before: 40, after: 80 },
      tailored_package: { resume: "", cover_letter: "", email: "" },
      optimizations: [{ original: "Completely different text", improved: "New text", reason: "", impact: "" }],
      metrics_and_proof: { suggested_metrics: [], proof_suggestions: [] },
    });
    expect(result.experience.at(0)?.points).toBe("Worked on features");
  });

  it("does not mutate the original resume", () => {
    const original = JSON.stringify(baseResume);
    mergeOptimizedResume(baseResume, {
      scores: { before: 40, after: 80 },
      tailored_package: { resume: "", cover_letter: "", email: "" },
      optimizations: [{ original: "Worked on features", improved: "Improved text", reason: "", impact: "" }],
      metrics_and_proof: { suggested_metrics: [], proof_suggestions: [] },
    });
    expect(JSON.stringify(baseResume)).toBe(original);
  });
});
