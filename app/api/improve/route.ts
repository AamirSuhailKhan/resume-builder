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

    const { section, content, tone, focus } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `You are an expert resume writer and recruiter. 
Improve the following HTML content for a resume's ${section} section.
Make the tone ${tone || 'professional'} and focus on ${focus || 'impact'}.

Rules:
1. Return ONLY the improved HTML. Do NOT include markdown wrappers like \`\`\`html or \`\`\`.
2. Maintain basic formatting tags (<b>, <i>, <ul>, <li>, <p>).
3. If it is a bullet point, ensure it is strong, uses action verbs, and highlights measurable impact.
4. Do not wrap the entire thing in a div. Keep the structure identical to the input.

Original Content:
${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let improved = response.text || "";
    
    // Clean up potential markdown formatting from Gemini
    improved = improved.replace(/^```(html)?\s*/i, '').replace(/```$/, '').trim();

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

    return NextResponse.json({ improved });
  } catch (error) {
    return errorToResponse(error);
  }
}
