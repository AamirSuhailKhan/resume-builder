import { z } from "zod";

/**
 * Strips code fences (like ```json ... ```) and leading/trailing whitespace.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
}

/**
 * Repairs unclosed strings, objects, and arrays in truncated JSON.
 */
export function repairIncompleteJson(text: string): string {
  const cleaned = stripCodeFence(text);
  const start = cleaned.search(/[\[{]/);

  if (start < 0) {
    return cleaned; // No JSON candidate found, return as-is
  }

  const jsonCandidate = cleaned.slice(start);
  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escaped = false;
  let repaired = "";

  for (let index = 0; index < jsonCandidate.length; index += 1) {
    const char = jsonCandidate[index];
    repaired += char;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const top = stack[stack.length - 1];
      const isValidPair = (top === "{" && char === "}") || (top === "[" && char === "]");
      if (isValidPair) {
        stack.pop();
      }
    }
  }

  // Auto-close string if left open
  if (inString) {
    repaired += "\"";
  }

  // Remove trailing comma if present before closing brackets
  repaired = repaired.trim();
  if (repaired.endsWith(",")) {
    repaired = repaired.slice(0, -1);
  }

  // Close remaining items on stack in reverse order
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === "{") {
      repaired += "}";
    } else if (last === "[") {
      repaired += "]";
    }
  }

  return repaired;
}

/**
 * Resilient JSON parsing helper that handles markdown wrappers, trailing commas,
 * and incomplete/truncated JSON structures.
 */
export function safeParseAIJson<T>(text: string, fallback: T): T {
  if (!text) return fallback;

  const cleaned = stripCodeFence(text);

  // Attempt 1: Direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Ignore and proceed to extraction/repair
  }

  // Attempt 2: Repair truncated structures
  try {
    const repaired = repairIncompleteJson(text);
    return JSON.parse(repaired) as T;
  } catch {
    // Ignore and proceed to candidate boundary search
  }

  // Attempt 3: Regex extract first candidate object
  try {
    const start = cleaned.search(/[\[{]/);
    if (start >= 0) {
      const candidates = cleaned.slice(start);
      // Clean up common bad characters and repair
      const repaired = repairIncompleteJson(candidates);
      return JSON.parse(repaired) as T;
    }
  } catch {
    // Ignore and return fallback
  }

  console.warn("[safeParseAIJson] Failed to parse and repair JSON. Returning fallback structure.", {
    rawLength: text.length,
    snippet: text.slice(0, 150),
  });

  return fallback;
}

/**
 * Parses and validates JSON using a Zod schema. If parsing or validation fails,
 * it injects defaults where needed or returns a clean fallback.
 */
export function safeParseAndValidate<T>(
  text: string,
  schema: z.ZodType<T>,
  fallback: T
): T {
  try {
    const rawParsed = safeParseAIJson(text, fallback);
    const validated = schema.safeParse(rawParsed);
    if (validated.success) {
      return validated.data;
    }
    
    console.warn("[safeParseAndValidate] Schema validation failed. Returning fallback.", validated.error.flatten());
    return fallback;
  } catch (error) {
    console.warn("[safeParseAndValidate] Exception during validation. Returning fallback.", error);
    return fallback;
  }
}
