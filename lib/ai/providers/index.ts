/**
 * lib/ai/providers/index.ts
 * ─────────────────────────────────────────────────────────────
 * Thin adapter that exposes the original AIModelRouter.executeTask()
 * API used by Gemini-backed routes, now delegating to lib/ai/core.ts.
 * ─────────────────────────────────────────────────────────────
 */

import { z } from "zod";
import { executeAI } from "@/lib/ai/core";

export interface AIProviderOptions {
  model: "cheap" | "medium" | "premium";
  temperature?: number;
  maxTokens?: number;
}

const MODEL_MAP: Record<AIProviderOptions["model"], string> = {
  cheap: "gemini-1.5-flash",
  medium: "gemini-2.0-flash",
  premium: "gemini-2.5-flash",
};

export class AIModelRouter {
  static async executeTask<T>(
    prompt: string,
    options: AIProviderOptions,
    schema?: z.ZodType<T>
  ): Promise<T> {
    const modelName = MODEL_MAP[options.model];

    const result = await executeAI<T>({
      system: "",
      user: prompt,
      provider: "gemini",
      model: modelName,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 4096,
      ...(schema ? { schema } : {}),
      fallback: (schema ? undefined : prompt) as T,
      maxRetries: options.model === "cheap" ? 1 : 0,
    });

    if (!result.success && result.meta.usedFallback) {
      if (options.model === "cheap") {
        console.warn("[AIModelRouter] Cheap tier failed — escalating to medium.");
        return AIModelRouter.executeTask(prompt, { ...options, model: "medium" }, schema);
      }
    }

    return result.data;
  }
}
