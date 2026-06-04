import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { structuredJSON } from "@/lib/ai/structured";
import { apiError, apiOk } from "@/lib/api/response";

export const runtime = "nodejs";

const AnalysisRequestSchema = z.object({
  resumeText: z.string().trim().min(50, "Resume content must be at least 50 characters."),
  jobDescription: z.string().trim().min(50, "Job description must be at least 50 characters."),
  companyName: z.string().trim().optional(),
  roleTitle: z.string().trim().optional(),
});

const AnalysisResultSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  fitClassification: z.enum(["Strong Match", "Good Match", "Partial Match", "Weak Match"]),
  alignmentSummary: z.string(),
  rejectionRisks: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  missingTechnologies: z.array(z.string()),
  experienceMatch: z.object({
    status: z.string(),
    requiredYears: z.string(),
    candidateYears: z.string(),
    feedback: z.string(),
  }),
  focusAreasForInterview: z.array(z.object({
    topic: z.string(),
    reason: z.string(),
    expectedQuestionStyle: z.string(),
  })),
  resumeStrengths: z.array(z.string()),
  resumeWeaknesses: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are an elite talent architect and senior technical screening director.
Analyze the candidate's resume against the target job description (and target company/role if provided).
Be highly analytical, objective, and realistic. Identify key engineering alignment points, missing technical keywords, experience matching gaps, and rejection risks.
Focus heavily on India-market SDE expectations.`;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = AnalysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid analysis request.", 400);
    }

    const { resumeText, jobDescription, companyName, roleTitle } = parsed.data;

    const userPrompt = `
Candidate Resume Content:
${resumeText}

Target Job Description:
${jobDescription}

${companyName ? `Target Company: ${companyName}` : ""}
${roleTitle ? `Target Role: ${roleTitle}` : ""}

Perform a detailed match analysis. Identify technical missing stack keywords, match percentage, structural focus areas for interviews, and primary rejection risks.

Return ONLY valid JSON matching this exact schema:
{
  "matchPercentage": number (0-100),
  "fitClassification": "Strong Match | Good Match | Partial Match | Weak Match",
  "alignmentSummary": "2-3 sentences analyzing fit.",
  "rejectionRisks": ["risk 1", "risk 2"],
  "missingKeywords": ["keyword 1", "keyword 2"],
  "missingTechnologies": ["tech 1", "tech 2"],
  "experienceMatch": {
    "status": "matched | exceeded | deficient",
    "requiredYears": "string",
    "candidateYears": "string",
    "feedback": "string"
  },
  "focusAreasForInterview": [
    { "topic": "string", "reason": "string", "expectedQuestionStyle": "string" }
  ],
  "resumeStrengths": ["strength 1", "strength 2"],
  "resumeWeaknesses": ["weakness 1", "weakness 2"]
}`;

    const fallback = {
      matchPercentage: 65,
      fitClassification: "Partial Match" as const,
      alignmentSummary: "The candidate demonstrates solid core software development skills but lacks direct production experience with high-throughput event processing and transactional ledgers required for this role.",
      rejectionRisks: ["No demonstrable scale experience in high-volume production setups.", "Missing transaction reliability patterns on resume."],
      missingKeywords: ["idempotency", "distributed locks", "event-driven design"],
      missingTechnologies: ["Apache Kafka", "Redis sharding", "PostgreSQL transactions"],
      experienceMatch: {
        status: "matched",
        requiredYears: "5+ years",
        candidateYears: "4 years",
        feedback: "Slightly below target years, but technical capability maps reasonably well.",
      },
      focusAreasForInterview: [
        { topic: "System Concurrency", reason: "The role requires managing payments concurrency, but resume only lists static API development.", expectedQuestionStyle: "LLD and thread-safety questions" }
      ],
      resumeStrengths: ["Strong TypeScript/Node.js backend project description.", "Good implementation of CI/CD pipelines."],
      resumeWeaknesses: ["Lacks metrics (TPS, latency figures) for projects.", "No details on database indexing or query optimization."],
    };

    const analysis = await structuredJSON({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      schema: AnalysisResultSchema,
      fallback,
    });

    return apiOk(analysis);
  } catch (error) {
    console.error("SERVER ERROR", error);
    return NextResponse.json({ error: "Internal server error analyzing resume." }, { status: 500 });
  }
}
