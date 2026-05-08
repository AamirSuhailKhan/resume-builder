import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { RateLimiter } from "@/lib/rate-limit"; // Assuming a rate limiter exists, or I will create one. Let's just do a basic one or omit it if it doesn't exist.

// I'll skip rate-limit import and do basic checking.

export const runtime = "nodejs";

const requestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resumeData: z.any(),
  jobDescription: z.string().min(10),
});

const responseSchema = z.object({
  optimizedResume: z.any(),
  atsScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()),
  improvements: z.array(z.string()),
  rewrittenBullets: z.array(z.object({
    original: z.string(),
    rewritten: z.string()
  })),
  matchAnalysis: z.string(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { resumeId, resumeData, jobDescription } = parsed.data;

    // Optional: Rate Limiting and Token Protection (budget)
    const usage = await prisma.aIUsage.aggregate({
      where: { userId: user.id },
      _sum: { estimatedCost: true }
    });
    if ((usage._sum.estimatedCost || 0) > 5.0) { // Limit to $5 per user for now
      return NextResponse.json({ error: "AI usage budget exceeded" }, { status: 429 });
    }

    // Versioning
    if (resumeId) {
      const resume = await prisma.resume.findUnique({ where: { id: resumeId, userId: user.id } });
      if (resume) {
        await prisma.resumeVersion.create({
          data: {
            resumeId,
            userId: user.id,
            version: resume.version,
            title: `Pre-optimization backup for ${resume.title}`,
            data: resume.data || {},
          }
        });
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert ATS optimizer and career coach. Optimize this resume for this job description.
Return ONLY valid JSON matching this schema:
{
  "optimizedResume": { ... complete modified resume object ... },
  "atsScore": number (0-100),
  "missingKeywords": ["keyword1", "keyword2"],
  "improvements": ["improvement 1", "improvement 2"],
  "rewrittenBullets": [{"original": "...", "rewritten": "..."}],
  "matchAnalysis": "Short summary of the match"
}

Resume Data: ${JSON.stringify(resumeData)}
Job Description: ${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const rawResult = JSON.parse(response.text ?? '{}');
    const validatedResult = responseSchema.parse(rawResult);

    // Track Usage
    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        provider: "google",
        model: "gemini-2.5-flash",
        promptTokens: 0, // Gemini SDK doesn't always return exact token counts synchronously here, estimating:
        completionTokens: 0,
        estimatedCost: 0.001, // Flat estimated cost per operation
      }
    });

    return NextResponse.json(validatedResult);
  } catch (error: any) {
    console.error("AI Optimization error:", error);
    return NextResponse.json({ error: error.message || "Optimization failed" }, { status: 500 });
  }
}
