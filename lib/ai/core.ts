/**
 * lib/ai/core.ts
 * ─────────────────────────────────────────────────────────────
 * CENTRALIZED AI EXECUTION LAYER
 *
 * All AI routes must funnel through this module.
 * Responsibilities:
 *   - Unified model dispatch (Anthropic Claude + Google Gemini)
 *   - Retry with exponential back-off
 *   - Response size logging + truncation detection
 *   - JSON repair → Zod validation → typed output
 *   - Schema-bound fallback injection
 *   - Normalised error shapes
 *   - Production-safe observability
 * ─────────────────────────────────────────────────────────────
 */

import { z } from "zod";
import { safeParseAIJson } from "@/lib/ai/recovery";

// ─── Types ───────────────────────────────────────────────────

export type AIProvider = "anthropic" | "gemini";

export interface AIRequestOptions<T> {
  /** System instruction (Anthropic) or prepended context (Gemini). */
  system: string;
  /** User-facing prompt body. */
  user: string;
  /** Max output tokens. Defaults: Anthropic 2048, Gemini 4096. */
  maxTokens?: number;
  /** Override the default model for this provider. */
  model?: string;
  /** Optional Zod schema. When provided, output is validated + coerced. */
  schema?: z.ZodType<T>;
  /** Guaranteed fallback if AI output is unusable after all recovery attempts. */
  fallback: T;
  /** Which AI provider to use. Default: "anthropic". */
  provider?: AIProvider;
  /** Max retry attempts on parse failure. Default: 1. */
  maxRetries?: number;
  /** Temperature override. Default: 0.3. */
  temperature?: number;
}

export interface AIResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  meta: {
    model: string;
    provider: AIProvider;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    retries: number;
    usedFallback: boolean;
    rawLength: number;
    truncationDetected: boolean;
  };
}

// ─── Constants ───────────────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_TOKENS_ANTHROPIC = 2048;
const DEFAULT_MAX_TOKENS_GEMINI = 4096;

// ─── Observability ───────────────────────────────────────────

function log(
  level: "info" | "warn" | "error",
  tag: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const prefix = `[ai:core:${tag}]`;
  const payload = meta ? JSON.stringify(meta) : "";
  if (level === "info") console.info(`${prefix} ${message}`, payload);
  else if (level === "warn") console.warn(`${prefix} ${message}`, payload);
  else console.error(`${prefix} ${message}`, payload);
}

function detectTruncation(raw: string, maxTokens: number): boolean {
  // Heuristic: if raw ends without a closing bracket and is near token limit
  const endsClean = /[}\]"0-9a-zA-Z]$/.test(raw.trimEnd());
  const nearLimit = raw.length > maxTokens * 3.5; // ~3.5 chars/token average
  return !endsClean || nearLimit;
}

// ─── Anthropic Executor ──────────────────────────────────────

async function callAnthropic(
  system: string,
  user: string,
  model: string,
  maxTokens: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "xxx" || apiKey.startsWith("mock")) {
    throw new Error("ANTHROPIC_API_KEY is not configured or is a placeholder.");
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Anthropic API ${response.status}: ${detail.slice(0, 200)}`
    );
  }

  const payload = await response.json();
  const text =
    (payload.content as Array<{ type: string; text?: string }>)
      ?.find((b) => b.type === "text")
      ?.text ?? "";
  return {
    text,
    inputTokens: payload.usage?.input_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? 0,
  };
}

// ─── Gemini Executor ─────────────────────────────────────────

async function callGemini(
  system: string,
  user: string,
  model: string,
  maxTokens: number,
  temperature: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const combinedPrompt = system ? `${system}\n\n${user}` : user;

  const response = await ai.models.generateContent({
    model,
    contents: combinedPrompt,
    config: {
      responseMimeType: "application/json",
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  return {
    text: response.text ?? "",
    inputTokens: 0,
    outputTokens: 0,
  };
}

// ─── Parse + Validate ────────────────────────────────────────

function parseAndValidate<T>(
  raw: string,
  schema: z.ZodType<T> | undefined,
  fallback: T
): { data: T; usedFallback: boolean } {
  const parsed = safeParseAIJson<T>(raw, fallback);

  if (!schema) {
    return { data: parsed, usedFallback: false };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { data: result.data, usedFallback: false };
  }

  log("warn", "validate", "Zod schema validation failed — using fallback", {
    errors: result.error.flatten(),
  });
  return { data: fallback, usedFallback: true };
}

// ─── Core Execute ────────────────────────────────────────────

export async function executeAI<T>(
  options: AIRequestOptions<T>
): Promise<AIResponse<T>> {
  const {
    system,
    user,
    schema,
    fallback,
    provider = "anthropic",
    maxRetries = 1,
    temperature = 0.3,
  } = options;

  const model =
    options.model ??
    (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_GEMINI_MODEL);
  const maxTokens =
    options.maxTokens ??
    (provider === "anthropic"
      ? DEFAULT_MAX_TOKENS_ANTHROPIC
      : DEFAULT_MAX_TOKENS_GEMINI);

  const startMs = Date.now();
  let retries = 0;
  let lastError: string | null = null;

  log("info", "start", `Executing AI task`, {
    provider,
    model,
    maxTokens,
    systemLen: system.length,
    userLen: user.length,
  });

  while (retries <= maxRetries) {
    try {
      const { text, inputTokens, outputTokens } =
        provider === "anthropic"
          ? await callAnthropic(system, user, model, maxTokens)
          : await callGemini(system, user, model, maxTokens, temperature);

      const rawLength = text.length;
      const truncationDetected = detectTruncation(text, maxTokens);

      log("info", "response", `Got AI response`, {
        rawLength,
        inputTokens,
        outputTokens,
        truncationDetected,
        retries,
      });

      if (truncationDetected) {
        log("warn", "truncation", "Possible truncation detected in AI output", {
          rawLength,
          maxTokens,
          tail: text.slice(-80),
        });
      }

      const { data, usedFallback } = parseAndValidate(text, schema, fallback);

      if (usedFallback && retries < maxRetries) {
        log("warn", "retry", `Parse/validate failed — retrying (${retries + 1}/${maxRetries})`);
        retries++;
        continue;
      }

      const latencyMs = Date.now() - startMs;
      log("info", "done", `AI task completed`, {
        latencyMs,
        usedFallback,
        retries,
      });

      return {
        success: true,
        data,
        error: null,
        meta: {
          model,
          provider,
          latencyMs,
          inputTokens,
          outputTokens,
          retries,
          usedFallback,
          rawLength,
          truncationDetected,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      log("error", "exec", `AI execution error (attempt ${retries + 1})`, {
        error: lastError,
        retries,
      });
      retries++;

      if (retries > maxRetries) break;

      // Short back-off before retry
      await new Promise((r) => setTimeout(r, 500 * retries));
    }
  }

  // All attempts exhausted — return fallback
  const latencyMs = Date.now() - startMs;
  log("warn", "fallback", "All AI attempts exhausted — returning fallback", {
    lastError,
    latencyMs,
    retries,
  });

  return {
    success: false,
    data: fallback,
    error: lastError ?? "AI execution failed after all retry attempts.",
    meta: {
      model,
      provider,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      retries,
      usedFallback: true,
      rawLength: 0,
      truncationDetected: false,
    },
  };
}

// ─── Convenience Wrappers ────────────────────────────────────

/**
 * Execute a structured JSON task via Anthropic Claude.
 * Always returns a typed, guaranteed-valid output object.
 */
export async function claudeJSON<T>(opts: {
  system: string;
  user: string;
  fallback: T;
  schema?: z.ZodType<T>;
  maxTokens?: number;
  model?: string;
  maxRetries?: number;
}): Promise<T> {
  const result = await executeAI<T>({
    ...opts,
    provider: "anthropic",
  });
  return result.data;
}

/**
 * Execute a structured JSON task via Google Gemini.
 * Always returns a typed, guaranteed-valid output object.
 */
export async function geminiJSON<T>(opts: {
  system: string;
  user: string;
  fallback: T;
  schema?: z.ZodType<T>;
  maxTokens?: number;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const result = await executeAI<T>({
    ...opts,
    provider: "gemini",
  });
  return result.data;
}

/**
 * Full AIResponse envelope — use when you need latency / token meta.
 */
export async function executeAIWithMeta<T>(
  opts: AIRequestOptions<T>
): Promise<AIResponse<T>> {
  return executeAI(opts);
}
