import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireUser } from "@/lib/auth/session";
import { applyRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";
import { errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const limited = await applyRateLimit(req, getClientIdentifier(req), "ai");
    if (limited) return limited;

    const { jobDescription } = await req.json();

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: 'Missing jobDescription' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert AI career coach, recruiter, and ATS optimization specialist.

Your job is NOT to generate generic content.
Your job is to:
- maximize interview shortlist probability
- provide specific, non-generic, high-impact improvements
- avoid vague statements
- avoid repetition
- avoid robotic AI tone

Always:
- be precise and actionable
- use strong action verbs
- focus on measurable impact
- tailor output strictly to the job description
- explain reasoning when required

Output must be structured, clean, and production-ready.
Analyze the following job description and extract:

1. Required Skills (must-have)
2. Optional Skills (good-to-have)
3. Core Responsibilities
4. Key Keywords (ATS critical terms)
5. Role Seniority Level
6. Industry Signals
7. Hidden Expectations (implied but not explicitly stated)

Return output in STRICT JSON format EXACTLY matching this structure:
{
  "required_skills": [],
  "optional_skills": [],
  "keywords": [],
  "responsibilities": [],
  "seniority": "",
  "hidden_expectations": [],
  "industry_signals": []
}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const raw = response.text ?? '{}';
    const result = JSON.parse(raw);

    const payload = {
      required_skills: Array.isArray(result?.required_skills) ? result.required_skills.map(String) : [],
      optional_skills: Array.isArray(result?.optional_skills) ? result.optional_skills.map(String) : [],
      keywords: Array.isArray(result?.keywords) ? result.keywords.map(String) : [],
      responsibilities: Array.isArray(result?.responsibilities) ? result.responsibilities.map(String) : [],
      seniority: typeof result?.seniority === "string" ? result.seniority : "",
      hidden_expectations: Array.isArray(result?.hidden_expectations) ? result.hidden_expectations.map(String) : [],
      industry_signals: Array.isArray(result?.industry_signals) ? result.industry_signals.map(String) : [],
    };

    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        provider: "google",
        model: "gemini-2.5-flash",
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0.001,
      }
    }).catch(() => undefined);

    return NextResponse.json(payload);

  } catch (error) {
    return errorToResponse(error);
  }
}
