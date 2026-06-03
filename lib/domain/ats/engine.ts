import { z } from "zod";
import { AIModelRouter } from "@/lib/ai/providers";

export const ATSEngineSchema = z.object({
  atsScore: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  semanticAlignment: z.number().min(0).max(100),
  formattingScore: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100),
  impactScore: z.number().min(0).max(100),
  reasoning: z.string(),
  evidence: z.array(z.string()),
  recommendations: z.array(
    z.object({
      suggestion: z.string(),
      confidence: z.number().min(0).max(1),
      source: z.enum(["verified", "ai_inferred", "estimated"]),
      evidence: z.string(),
      explanation: z.string(),
    })
  ),
});

export type ATSAnalysisResult = z.infer<typeof ATSEngineSchema>;

export class ATSEngine {
  static async analyze(resumeText: string, jobDescription: string): Promise<ATSAnalysisResult> {
    const prompt = `
      You are an expert deterministic ATS screening engine.
      Analyze the given resume against the job description.
      Output your analysis strictly in the requested JSON structure.
      
      Job Description:
      ${jobDescription}
      
      Resume:
      ${resumeText}
    `;

    // ATS Scoring is a medium complexity task, use medium tier
    const result = await AIModelRouter.executeTask<ATSAnalysisResult>(prompt, {
      model: "medium",
      temperature: 0.1, // Highly deterministic
      fallback: {
        atsScore: 0,
        matchedKeywords: [],
        missingKeywords: [],
        semanticAlignment: 0,
        formattingScore: 0,
        readabilityScore: 0,
        impactScore: 0,
        reasoning: "AI analysis was unavailable; returning a safe empty ATS analysis.",
        evidence: [],
        recommendations: [],
      } satisfies ATSAnalysisResult,
    }, ATSEngineSchema);

    return result;
  }
}
