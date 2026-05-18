import { describe, expect, it } from "vitest";
import { inferCollegeTier } from "@/lib/coach/college-tier";

describe("inferCollegeTier", () => {
  it("classifies IIT as tier1", () => {
    const result = inferCollegeTier([{ school: "IIT Delhi", degree: "B.Tech", year: "2020" }]);
    expect(result.tier).toBe("tier1");
  });

  it("classifies unknown school as tier3", () => {
    const result = inferCollegeTier([{ school: "Local College XYZ", degree: "B.A.", year: "2019" }]);
    expect(result.tier).toBe("tier3");
  });

  it("handles missing education", () => {
    const result = inferCollegeTier([]);
    expect(result.tier).toBe("unknown");
  });
});
