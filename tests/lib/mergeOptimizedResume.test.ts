import { mergeOptimizedResume } from "@/lib/ai";
import { normalizeResume } from "@/lib/normalizeResume";

const baseResume = normalizeResume({
  id: crypto.randomUUID(),
  personal: { name: "Test User" },
  experience: [
    { id: "exp-1", role: "Engineer", company: "Acme", points: "Worked on features" },
  ],
});

const emptyOptResult = {
  scores: { before: 40, after: 80 },
  tailored_package: { resume: "", cover_letter: "", email: "" },
  optimizations: [] as { original: string; improved: string; reason: string; impact: string }[],
  metrics_and_proof: { suggested_metrics: [], proof_suggestions: [] },
};

describe("mergeOptimizedResume", () => {
  it("replaces matching bullet point with improved version (exact match)", () => {
    const result = mergeOptimizedResume(baseResume, {
      ...emptyOptResult,
      optimizations: [
        { original: "Worked on features", improved: "Architected 3 core features", reason: "", impact: "" },
      ],
    });
    expect(result.experience![0]!.points).toBe("Architected 3 core features");
  });

  it("does not modify resume when no optimization matches", () => {
    const result = mergeOptimizedResume(baseResume, {
      ...emptyOptResult,
      optimizations: [
        { original: "Completely different text xyz", improved: "New text", reason: "", impact: "" },
      ],
    });
    expect(result.experience![0]!.points).toBe("Worked on features");
  });

  it("applies fuzzy match when 80%+ of original words are found in the bullet", () => {
    const result = mergeOptimizedResume(baseResume, {
      ...emptyOptResult,
      optimizations: [
        // "Worked features" is 2/2 words that appear in "Worked on features" → >80% match
        { original: "Worked features", improved: "Delivered 5 core features", reason: "", impact: "" },
      ],
    });
    expect(result.experience![0]!.points).toBe("Delivered 5 core features");
  });

  it("does not mutate the original resume", () => {
    const original = JSON.stringify(baseResume);
    mergeOptimizedResume(baseResume, {
      ...emptyOptResult,
      optimizations: [
        { original: "Worked on features", improved: "Improved text", reason: "", impact: "" },
      ],
    });
    expect(JSON.stringify(baseResume)).toBe(original);
  });

  it("skips optimizations with empty original or improved", () => {
    const result = mergeOptimizedResume(baseResume, {
      ...emptyOptResult,
      optimizations: [
        { original: "", improved: "Some new text", reason: "", impact: "" },
        { original: "Worked on features", improved: "", reason: "", impact: "" },
      ],
    });
    expect(result.experience![0]!.points).toBe("Worked on features");
  });
});
