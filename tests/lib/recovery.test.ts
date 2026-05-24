import { describe, it, expect } from "vitest";
import { safeParseAIJson, repairIncompleteJson } from "@/lib/ai/recovery";

describe("JSON Recovery and Repair Utilities", () => {
  it("should parse valid clean JSON", () => {
    const json = '{"a": 1, "b": "hello"}';
    expect(safeParseAIJson(json, { a: 0 })).toEqual({ a: 1, b: "hello" });
  });

  it("should strip markdown fences and parse", () => {
    const json = "```json\n{\n  \"a\": 1\n}\n```";
    expect(safeParseAIJson(json, { a: 0 })).toEqual({ a: 1 });
  });

  it("should repair truncated unclosed string in JSON", () => {
    const truncated = '{"a": "hello worl';
    const repaired = repairIncompleteJson(truncated);
    expect(JSON.parse(repaired)).toEqual({ a: "hello worl" });
  });

  it("should repair truncated nested array", () => {
    const truncated = '{"items": ["apple", "ban';
    const repaired = repairIncompleteJson(truncated);
    expect(JSON.parse(repaired)).toEqual({ items: ["apple", "ban"] });
  });

  it("should repair truncated object with trailing comma", () => {
    const truncated = '{"id": 123, "name": "Razorpay",';
    const repaired = repairIncompleteJson(truncated);
    expect(JSON.parse(repaired)).toEqual({ id: 123, name: "Razorpay" });
  });

  it("should fall back gracefully to a default object on completely unparseable text", () => {
    const unparseable = "this is completely invalid text that contains no json at all";
    const fallback = { status: "offline", code: 500 };
    expect(safeParseAIJson(unparseable, fallback)).toEqual(fallback);
  });
});
