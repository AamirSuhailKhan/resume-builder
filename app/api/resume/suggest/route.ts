import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { apiError, errorToResponse } from "@/lib/api/response";
import type { ResumeData } from "@/lib/storage";
import type { ResumeSuggestion, SuggestionSection, SuggestionSession, ResumeIntelligenceData } from "@/types/suggestions";

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

function fallbackIntelligence(resume: ResumeData, jobDescription = ""): ResumeIntelligenceData {
  const missingSkills = keywordsFromJob(jobDescription, resume.skills);
  const totalExperiencePoints = resume.experience.map(e => e.points).join("\n");
  const metricMatches = totalExperiencePoints.match(/\d+%/g) || [];
  const metricsCount = metricMatches.length;

  const weaknesses = [];
  if (metricsCount < 3) {
    weaknesses.push({
      id: "metric_density",
      issue: "Low metric density in experience bullets",
      severity: "critical" as const,
      section: "experience",
      recommendation: "Quantify achievements using the X-Y-Z formula. E.g. 'Accomplished [X] as measured by [Y], by doing [Z]' rather than describing responsibilities."
    });
  }
  if (resume.skills.length < 5) {
    weaknesses.push({
      id: "skills_sparse",
      issue: "Sparse skills matrix",
      severity: "moderate" as const,
      section: "skills",
      recommendation: "Ensure core technologies, frameworks, and libraries are explicitly listed to survive automated parsing."
    });
  }
  if (missingSkills.length > 2) {
    weaknesses.push({
      id: "skills_gap",
      issue: `Missing critical tech tags: ${missingSkills.slice(0, 3).join(", ")}`,
      severity: "critical" as const,
      section: "skills",
      recommendation: "Integrate these technical keywords in both your skills list and experience section if you have worked with them."
    });
  }

  const scanTime = totalExperiencePoints.split(/\s+/).length > 300 ? 5.8 : 7.2;

  return {
    callbackProbability: {
      before: 35 + Math.min(metricsCount * 5 + resume.skills.length * 2, 35),
      after: 82
    },
    dimensions: {
      technicalDepth: { before: 60, after: 85, feedback: "Tech stacks are mentioned but lack architectural context and version highlights." },
      achievementFraming: { before: 50, after: 80, feedback: "Several bullets lead with passive verbs (e.g. 'helped', 'worked on') instead of strong impact verbs." },
      atsCompatibility: { before: 75, after: 90, feedback: "Format is parsable but lacks specific technical keywords specified in the job description." },
      recruiterPsychology: { before: 55, after: 82, feedback: "First 6-second scan reveals high text block density, which increases friction." },
      marketCompetitiveness: { before: 62, after: 85, feedback: "Aligns decently with mid-tier product expectations, but needs specific outcomes for Tier-1 competitiveness." }
    },
    weaknesses,
    recruiterScannability: {
      scanTimeSeconds: scanTime,
      readabilityScore: 68,
      topTakeaways: [
        "Has solid experience but fails to highlight primary ownership.",
        "Core skills section is visible, but keywords are unranked.",
        "Academic credentials align with general standards."
      ],
      criticalFrictionPoints: [
        "Generic phrases reduce perceived senior-level command.",
        "Missing specific metric outcomes makes claims harder to trust."
      ]
    },
    indiaMarketFit: {
      tierMatch: "Tier 2 Product",
      targetMatchPercentage: 70,
      skillsGap: missingSkills.slice(0, 4),
      recommendedSteps: [
        "Reframe experience statements to lead with action verbs.",
        "Explicitly list database and cloud stacks in experience bullets.",
        "Incorporate missing core libraries."
      ]
    }
  };
}

function sanitizeIntelligence(raw: unknown, resume: ResumeData, jobDescription: string): ResumeIntelligenceData {
  const rec = asRecord(raw);
  const cb = asRecord(rec.callbackProbability);
  const dim = asRecord(rec.dimensions);
  const scannability = asRecord(rec.recruiterScannability);
  const fit = asRecord(rec.indiaMarketFit);

  const defaultIntel = fallbackIntelligence(resume, jobDescription);

  const sanitizeDim = (val: unknown, def: { before: number; after: number; feedback: string }) => {
    const r = asRecord(val);
    return {
      before: clampScore(r.before) ?? def.before,
      after: clampScore(r.after) ?? def.after,
      feedback: toText(r.feedback) || def.feedback
    };
  };

  const rawWeaknesses = Array.isArray(rec.weaknesses) ? rec.weaknesses : [];
  const weaknesses = rawWeaknesses.flatMap((w) => {
    const r = asRecord(w);
    const issue = toText(r.issue);
    if (!issue) return [];
    return {
      id: toText(r.id) || randomUUID(),
      issue,
      severity: (["critical", "moderate", "low"].includes(toText(r.severity)) ? toText(r.severity) : "moderate") as "critical" | "moderate" | "low",
      section: toText(r.section) || "experience",
      recommendation: toText(r.recommendation) || "Optimize this section for clarity."
    };
  });

  return {
    callbackProbability: {
      before: clampScore(cb.before) ?? defaultIntel.callbackProbability.before,
      after: clampScore(cb.after) ?? defaultIntel.callbackProbability.after
    },
    dimensions: {
      technicalDepth: sanitizeDim(dim.technicalDepth, defaultIntel.dimensions.technicalDepth),
      achievementFraming: sanitizeDim(dim.achievementFraming, defaultIntel.dimensions.achievementFraming),
      atsCompatibility: sanitizeDim(dim.atsCompatibility, defaultIntel.dimensions.atsCompatibility),
      recruiterPsychology: sanitizeDim(dim.recruiterPsychology, defaultIntel.dimensions.recruiterPsychology),
      marketCompetitiveness: sanitizeDim(dim.marketCompetitiveness, defaultIntel.dimensions.marketCompetitiveness)
    },
    weaknesses: weaknesses.length > 0 ? weaknesses : defaultIntel.weaknesses,
    recruiterScannability: {
      scanTimeSeconds: typeof scannability.scanTimeSeconds === "number" ? scannability.scanTimeSeconds : defaultIntel.recruiterScannability.scanTimeSeconds,
      readabilityScore: clampScore(scannability.readabilityScore) ?? defaultIntel.recruiterScannability.readabilityScore,
      topTakeaways: Array.isArray(scannability.topTakeaways) ? scannability.topTakeaways.map(toText).filter(Boolean) : defaultIntel.recruiterScannability.topTakeaways,
      criticalFrictionPoints: Array.isArray(scannability.criticalFrictionPoints) ? scannability.criticalFrictionPoints.map(toText).filter(Boolean) : defaultIntel.recruiterScannability.criticalFrictionPoints
    },
    indiaMarketFit: {
      tierMatch: (["Tier 1 Product", "Tier 2 Product", "Service/Consulting", "Early-Stage Startup"].includes(toText(fit.tierMatch))
        ? toText(fit.tierMatch)
        : defaultIntel.indiaMarketFit.tierMatch) as any,
      targetMatchPercentage: clampScore(fit.targetMatchPercentage) ?? defaultIntel.indiaMarketFit.targetMatchPercentage,
      skillsGap: Array.isArray(fit.skillsGap) ? fit.skillsGap.map(toText).filter(Boolean) : defaultIntel.indiaMarketFit.skillsGap,
      recommendedSteps: Array.isArray(fit.recommendedSteps) ? fit.recommendedSteps.map(toText).filter(Boolean) : defaultIntel.indiaMarketFit.recommendedSteps
    }
  };
}

async function getAiSuggestions(resume: ResumeData, jobDescription: string, userId: string) {
  if (!process.env.GEMINI_API_KEY) return null;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You are a senior technical recruiter and resume intelligence expert. Return only JSON.
Analyze this resume against the target job description. Generate concise, field-level suggestions for optimization, as well as a multi-dimensional recruiter-informed audit of the resume.

Use paths from this schema only:
- personal.summary
- personal.name
- experience[index].role
- experience[index].points
- education[index].degree
- skills

Do not fabricate employers, degrees, dates, or exact metrics. If metrics are useful, phrase them as editable suggestions.

Return exactly this JSON structure:
{
  "scores": { "before": number, "after": number },
  "intelligence": {
    "callbackProbability": {
      "before": number,
      "after": number
    },
    "dimensions": {
      "technicalDepth": { "before": number, "after": number, "feedback": "Evaluation of tech stacks, frameworks, and tools vs target job requirements." },
      "achievementFraming": { "before": number, "after": number, "feedback": "Evaluation of metric density and outcome-oriented phrasing." },
      "atsCompatibility": { "before": number, "after": number, "feedback": "Parseability score, formatting, structural compliance." },
      "recruiterPsychology": { "before": number, "after": number, "feedback": "Scanability, readability, impact delivery." },
      "marketCompetitiveness": { "before": number, "after": number, "feedback": "Competitiveness check in the Indian developer market." }
    },
    "weaknesses": [
      {
        "id": "weakness_1",
        "issue": "Brief description of weakness",
        "severity": "critical",
        "section": "experience",
        "recommendation": "How to resolve this"
      }
    ],
    "recruiterScannability": {
      "scanTimeSeconds": number,
      "readabilityScore": number,
      "topTakeaways": ["String list of 3-4 points a recruiter notices in first glance"],
      "criticalFrictionPoints": ["String list of concerns or reasons for rejection"]
    },
    "indiaMarketFit": {
      "tierMatch": "Tier 1 Product",
      "targetMatchPercentage": number,
      "skillsGap": ["List of missing in-demand skills in Indian hiring landscape"],
      "recommendedSteps": ["Actionable checklist of next steps"]
    }
  },
  "suggestions": [
    {
      "section": "summary",
      "path": "personal.summary",
      "original": "existing exact text when available",
      "suggested": "replacement text",
      "rationale": "recruiter psychological rationale for the shift",
      "impact": "expected impact on scannability",
      "confidence": 0.85,
      "scoreDelta": 5
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
  console.log("requireUserId validation started");
  let session = null;
  let error = null;
  try {
    session = await auth();
  } catch (err) {
    error = err;
  }
  const userId = session?.user?.id;
  console.log("User:", session?.user);
  console.log("Session:", session);
  console.log("Auth error:", error);
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}

export async function POST(req: NextRequest) {
  try {
    console.log("Request received");
    let authSession = null;
    let authError = null;
    try {
      authSession = await auth();
    } catch (err) {
      authError = err;
    }
    const userId = authSession?.user?.id;
    console.log("User:", authSession?.user);
    console.log("Session:", authSession);
    console.log("Auth error:", authError);
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid suggestion request.", 400);

    const { resumeId, resumeData, jobDescription = "" } = parsed.data;
    if (!resumeId && !resumeData) return apiError("Provide resumeId or resumeData.", 400);

    // Guest Mode Bypass
    if (!userId) {
      const rawResume = resumeData;
      const resume = normalizeResume({
        ...asRecord(rawResume),
        id: "demo",
        title: "Demo Resume",
      });

      const suggestions = fallbackSuggestions(resume, jobDescription);
      const sessionData: SuggestionSession = {
        id: randomUUID(),
        source: "api",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobDescription,
        resumeSnapshot: resume,
        suggestions,
        persisted: false,
      };

      sessionData.intelligence = fallbackIntelligence(resume, jobDescription);
      const metricsCount = resume.experience.map(e => e.points).join("\n").match(/\d+%/g)?.length || 0;
      sessionData.scores = {
        before: 35 + Math.min(metricsCount * 5 + resume.skills.length * 2, 35),
        after: 82
      };

      return NextResponse.json({ data: sessionData, error: null });
    }

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

    let aiResult: any = null;
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
    const suggestionSession: SuggestionSession = {
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
      suggestionSession.scores = { before, after };
    }

    // Process intelligence audit
    const rawIntel = aiResult?.intelligence;
    suggestionSession.intelligence = sanitizeIntelligence(rawIntel, resume, jobDescription);

    return NextResponse.json({ data: suggestionSession, error: null });
  } catch (error) {
    return errorToResponse(error);
  }
}
