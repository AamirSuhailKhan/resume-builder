import type { z } from "zod";
import { executeAI, type AIProvider, type AIResponse } from "@/lib/ai/core";

export type StructuredAIOptions<T> = {
  system: string;
  user: string;
  fallback: T;
  schema?: z.ZodType<T>;
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
  maxRetries?: number;
  temperature?: number;
};

export async function executeStructuredAI<T>(
  options: StructuredAIOptions<T>
): Promise<AIResponse<T>> {
  return executeAI<T>({
    provider: "anthropic",
    maxRetries: 1,
    temperature: 0.3,
    ...options,
  });
}

export async function structuredJSON<T>(
  options: StructuredAIOptions<T>
): Promise<T> {
  const result = await executeStructuredAI(options);
  return result.data;
}
