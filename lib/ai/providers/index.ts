import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export interface AIProviderOptions {
  model: "cheap" | "medium" | "premium";
  temperature?: number;
  maxTokens?: number;
}

export class AIModelRouter {
  
  static getModel(tier: AIProviderOptions["model"]) {
    // Model routing logic
    switch (tier) {
      case "cheap":
        // e.g., for keyword extraction
        return google("gemini-1.5-flash");
      case "medium":
        // e.g., for ATS scoring
        return openai("gpt-4o-mini");
      case "premium":
        // e.g., for full resume rewrite
        return openai("gpt-4o");
      default:
        return openai("gpt-4o-mini");
    }
  }

  static async executeTask<T>(
    prompt: string, 
    options: AIProviderOptions, 
    schema?: any
  ): Promise<T> {
    const model = this.getModel(options.model);
    
    try {
      if (schema) {
        const result = await generateObject({
          model,
          prompt,
          schema,
          temperature: options.temperature ?? 0.2,
        });
        return result.object as T;
      } else {
        const result = await generateText({
          model,
          prompt,
          temperature: options.temperature ?? 0.7,
        });
        return result.text as T;
      }
    } catch (error) {
      console.error(`[AIModelRouter] Task failed with tier ${options.model}`, error);
      // Fallback strategy: if premium fails, we might just fail. If cheap fails, fallback to medium.
      if (options.model === "cheap") {
        console.log("[AIModelRouter] Falling back to medium tier");
        return this.executeTask(prompt, { ...options, model: "medium" }, schema);
      }
      throw error;
    }
  }
}
