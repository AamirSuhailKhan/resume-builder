import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireUser } from "@/lib/auth/session";
import { applyRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";
import { errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { safeParseAIJson } from "@/lib/ai/recovery";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const limited = await applyRateLimit(req, getClientIdentifier(req), "ai");
    if (limited) return limited;

    const { resumeData, jobDescription, tone, focus } = await req.json();

    if (!resumeData || !jobDescription?.trim()) {
      return NextResponse.json({ error: 'Missing resumeData or jobDescription' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert recruiter and hiring manager.

Generate a highly tailored job application package based on the resume and job description.

Your goal:
- maximize interview chances
- sound human, confident, and specific
- avoid generic AI phrases

--------------------------------------
OUTPUT FORMAT (STRICT JSON):

{
  "cover_letter": "",
  "email": ""
}

--------------------------------------
COVER LETTER RULES:

- 3–4 short paragraphs
- Start with strong opening (role + interest)
- Highlight 2–3 most relevant achievements
- Align with job requirements
- Show impact (metrics if possible)
- End with confident closing

Tone:
- professional
- concise
- human (not robotic)

--------------------------------------
EMAIL RULES:

- very short (5–6 lines max)
- include:
  - subject line
  - greeting
  - 1–2 key highlights
  - mention attached resume
  - polite closing

--------------------------------------
SETTINGS:
Tone: ${tone || 'professional'}
Focus: ${focus || 'ATS Optimized'}

--------------------------------------
INPUT:

RESUME:
${JSON.stringify(resumeData)}

JOB DESCRIPTION:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const raw = response.text ?? '{}';
    const result = safeParseAIJson(raw, {
      cover_letter: "",
      email: ""
    });

    const payload = {
      cover_letter: typeof result?.cover_letter === 'string' ? result.cover_letter : '',
      email: typeof result?.email === 'string' ? result.email : '',
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
