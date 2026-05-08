import { normalizeResume } from "@/lib/normalizeResume";

describe("normalizeResume", () => {
  it("returns object with required fields when passed empty object", () => {
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

  it("does not mutate the input object", () => {
    const input = { id: crypto.randomUUID(), title: "My Resume" };
    const frozen = Object.freeze(input);
    expect(() => normalizeResume(frozen)).not.toThrow();
  });
});
