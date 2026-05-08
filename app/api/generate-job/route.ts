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

    const { jobTitle } = await req.json();

    if (!jobTitle || typeof jobTitle !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid jobTitle' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are a recruiter. Generate a realistic, detailed job description for the role: "${jobTitle}". Include required skills, tools, and responsibilities. Return ONLY valid JSON in this format:
{
  "jobDescription": "Full job description text here..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const resultText = response.text || '{}';
    const result = JSON.parse(resultText);

    if (!result.jobDescription) {
      throw new Error('AI did not return a valid job description');
    }

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

    return NextResponse.json({ jobDescription: result.jobDescription });
  } catch (error) {
    return errorToResponse(error);
  }
}
