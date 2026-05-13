import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { apiError, errorToResponse } from "@/lib/api/response";
import type { ResumeData } from "@/lib/storage";
import type { ResumeSuggestion, SuggestionSection, SuggestionSession } from "@/types/suggestions";

export const runtime = "nodejs";

const requestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resumeData: z.unknown().optional(),
  jobDescription: z.string().max(20000).optional(),
});

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeSection(value: unknown): SuggestionSection {
  const section = toText(value);
  if (["summary", "experience", "education", "skills", "personal", "other"].includes(section)) {
    return section as SuggestionSection;
  }
  return "other";
}

function keywordsFromJob(jobDescription: string, existingSkills: string[]) {
  const stopWords = new Set([
    "the", "and", "with", "for", "from", "that", "this", "will", "you", "are", "our",
    "have", "has", "your", "into", "using", "work", "role", "team", "job", "years",
  ]);
  const existing = new Set(existingSkills.map((skill) => skill.toLowerCase()));
  const counts = new Map<string, number>();

  for (const match of jobDescription.toLowerCase().matchAll(/[a-z][a-z0-9+#.-]{2,}/g)) {
    const word = match[0];
    if (stopWords.has(word) || existing.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function fallbackSuggestions(resume: ResumeData, jobDescription = "", resumeId?: string): ResumeSuggestion[] {
  const now = new Date().toISOString();
  const suggestions: ResumeSuggestion[] = [];
  const missingKeywords = keywordsFromJob(jobDescription, resume.skills);
  const firstKeywordPhrase = missingKeywords.slice(0, 3).join(", ");
  const resumeIdPatch = resumeId ? { resumeId } : {};

  if (resume.personal.summary.length < 180 && firstKeywordPhrase) {
    suggestions.push({
      id: randomUUID(),
      ...resumeIdPatch,
      section: "summary",
      path: "personal.summary",
      original: resume.personal.summary,
      suggested: `${resume.personal.summary || "Results-driven professional"} with hands-on experience aligned to ${firstKeywordPhrase}, focused on measurable delivery, collaboration, and business impact.`,
      rationale: "Adds role-specific keywords and a clearer impact statement to the professional summary.",
      impact: "Improves keyword coverage near the top of the resume.",
      confidence: 0.72,
      scoreDelta: 6,
      status: "pending",
      createdAt: now,
    });
  }

  const firstExperience = resume.experience[0];
  if (firstExperience?.points) {
    const original = firstExperience.points.split("\n").find((line) => line.trim()) ?? firstExperience.points;
    suggestions.push({
      id: randomUUID(),
      ...resumeIdPatch,
      section: "experience",
      path: "experience[0].points",
      original,
      suggested: original.replace(/^worked on/i, "Delivered").replace(/^fixed/i, "Resolved") || original,
      rationale: "Uses a stronger action verb while preserving the original claim.",
      impact: "Makes the first experience bullet easier for recruiters to scan.",
      confidence: 0.68,
      scoreDelta: 4,
      status: "pending",
      createdAt: now,
    });
  }

  if (missingKeywords.length > 0) {
    suggestions.push({
      id: randomUUID(),
      ...resumeIdPatch,
      section: "skills",
      path: "skills",
      original: resume.skills.join(", "),
      suggested: Array.from(new Set([...resume.skills, ...missingKeywords.slice(0, 4)])).join(", "),
      rationale: "Surfaces recurring job-description terms in the skills section for review.",
      impact: "Can improve ATS matching when the keywords reflect real experience.",
      confidence: 0.64,
      scoreDelta: 5,
      status: "pending",
      createdAt: now,
    });
  }

  return suggestions;
}

function sanitizeAiSuggestions(raw: unknown, resumeId?: string): ResumeSuggestion[] {
  const now = new Date().toISOString();
  const list = Array.isArray(asRecord(raw).suggestions) ? asRecord(raw).suggestions as unknown[] : [];

  return list.flatMap((item) => {
    const record = asRecord(item);
    const path = toText(record.path);
    const original = toText(record.original);
    const suggested = toText(record.suggested);
    const rationale = toText(record.rationale);
    if (!path || !suggested || suggested === original) return [];

    const suggestion: ResumeSuggestion = {
      id: toText(record.id) || randomUUID(),
      ...(resumeId ? { resumeId } : {}),
      section: normalizeSection(record.section),
      path,
      original,
      suggested,
      rationale: rationale || "Suggested by AI based on the target role.",
      status: "pending",
      createdAt: now,
    };

    const impact = toText(record.impact);
    if (impact) suggestion.impact = impact;

    if (typeof record.confidence === "number") {
      suggestion.confidence = Math.max(0, Math.min(1, record.confidence));
    }

    if (typeof record.scoreDelta === "number") {
      suggestion.scoreDelta = Math.round(record.scoreDelta);
    }

    return suggestion;
  }).slice(0, 12);
}

async function getAiSuggestions(resume: ResumeData, jobDescription: string, userId: string) {
  if (!process.env.GEMINI_API_KEY) return null;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You are a resume editor. Return only JSON.
Create concise, field-level resume suggestions for the target job.
Use paths from this schema only:
- personal.summary
- personal.name
- experience[index].role
- experience[index].points
- education[index].degree
- skills

Do not fabricate employers, degrees, dates, or exact metrics. If metrics are useful, phrase them as editable suggestions.

Return this shape:
{
  "scores": { "before": number, "after": number },
  "suggestions": [
    {
      "section": "summary|experience|education|skills|personal|other",
      "path": "personal.summary",
      "original": "existing exact text when available",
      "suggested": "replacement text",
      "rationale": "why",
      "impact": "expected effect",
      "confidence": 0.7,
      "scoreDelta": 4
    }
  ]
}

Resume:
${JSON.stringify(resume)}

Job description:
${jobDescription}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text ?? "{}");

  await prisma.aIUsage.create({
    data: {
      userId,
      provider: "google",
      model: "gemini-2.5-flash",
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0.001,
    },
  }).catch(() => undefined);

  return parsed;
}

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid suggestion request.", 400);

    const { resumeId, resumeData, jobDescription = "" } = parsed.data;
    if (!resumeId && !resumeData) return apiError("Provide resumeId or resumeData.", 400);

    const storedResume = resumeId
      ? await prisma.resume.findFirst({
          where: { id: resumeId, userId },
          select: { id: true, title: true, data: true, version: true },
        })
      : null;

    if (resumeId && !storedResume) return apiError("Resume not found.", 404);

    const rawResume = storedResume?.data ?? resumeData;
    const resume = normalizeResume({
      ...asRecord(rawResume),
      id: resumeId ?? asRecord(rawResume).id,
      title: storedResume?.title ?? asRecord(rawResume).title,
    });

    let aiResult: unknown = null;
    try {
      aiResult = await getAiSuggestions(resume, jobDescription, userId);
    } catch (error) {
      console.warn("[resume/suggest] Falling back to local suggestions", error);
    }

    const aiSuggestions = sanitizeAiSuggestions(aiResult, resumeId);
    const suggestions = aiSuggestions.length > 0
      ? aiSuggestions
      : fallbackSuggestions(resume, jobDescription, resumeId);

    const scoresRecord = asRecord(asRecord(aiResult).scores);
    const before = clampScore(scoresRecord.before);
    const after = clampScore(scoresRecord.after);
    const now = new Date().toISOString();
    const session: SuggestionSession = {
      id: randomUUID(),
      ...(resumeId ? { resumeId } : {}),
      source: "api",
      createdAt: now,
      updatedAt: now,
      jobDescription,
      resumeSnapshot: resume,
      suggestions,
      persisted: false,
    };

    if (before !== undefined && after !== undefined) {
      session.scores = { before, after };
    }

    return NextResponse.json({ data: session, error: null });
  } catch (error) {
    return errorToResponse(error);
  }
}
