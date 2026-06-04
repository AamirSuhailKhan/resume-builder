import { normalizeResume } from "@/lib/normalizeResume";

describe("normalizeResume", () => {
  it("returns object with all required top-level fields when passed empty object", () => {
    const result = normalizeResume({});
    expect(result).toHaveProperty("personal");
    expect(result).toHaveProperty("experience");
    expect(result).toHaveProperty("education");
    expect(result).toHaveProperty("skills");
  });

  it("preserves existing id", () => {
    const id = crypto.randomUUID();
    const result = normalizeResume({ id });
    expect(result.id).toBe(id);
  });

  it("generates an id when not provided", () => {
    const result = normalizeResume({});
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
  });

  it("does not mutate the input object", () => {
    const input = { id: crypto.randomUUID(), title: "My Resume" };
    const frozen = Object.freeze(input);
    expect(() => normalizeResume(frozen)).not.toThrow();
  });

  it("skills is always an array", () => {
    expect(Array.isArray(normalizeResume({}).skills)).toBe(true);
    expect(Array.isArray(normalizeResume({ skills: ["React"] }).skills)).toBe(true);
  });

  it("experience is always an array", () => {
    expect(Array.isArray(normalizeResume({}).experience)).toBe(true);
  });

  it("education is always an array", () => {
    expect(Array.isArray(normalizeResume({}).education)).toBe(true);
  });
});
