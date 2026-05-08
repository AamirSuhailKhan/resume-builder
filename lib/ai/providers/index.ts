import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

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
  private static getClient() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  static async executeTask<T>(
    prompt: string,
    options: AIProviderOptions,
    schema?: z.ZodType<T>
  ): Promise<T> {
    const ai = this.getClient();
    const modelName = MODEL_MAP[options.model];

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: schema ? "application/json" : "text/plain",
          temperature: options.temperature ?? 0.2,
        },
      });

      const raw = response.text ?? "";

      if (schema) {
        const parsed = JSON.parse(raw);
        return schema.parse(parsed);
      }

      return raw as T;
    } catch (error) {
      console.error(`[AIModelRouter] Task failed with tier ${options.model}`, error);
      if (options.model === "cheap") {
        console.warn("[AIModelRouter] Cheap tier (Gemini Flash) failed - falling back to medium tier. Check GEMINI_API_KEY.");
        return this.executeTask(prompt, { ...options, model: "medium" }, schema);
      }
      throw error;
    }
  }
}
