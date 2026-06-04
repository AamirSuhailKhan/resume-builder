import { z } from "zod";
import { geminiJSON } from "@/lib/ai/core";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";
import { errorToResponse } from "@/lib/api/response";
import { memoryService } from "@/lib/services/memory.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const requestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resumeData: z.unknown(),
  jobDescription: z.string().min(10),
});

const responseSchema = z.object({
  optimizedResume: z.unknown(),
  atsScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()),
  improvements: z.array(z.string()),
  rewrittenBullets: z.array(z.object({
    original: z.string(),
    rewritten: z.string()
  })),
  matchAnalysis: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const limited = await applyRateLimit(req, getClientIdentifier(req), "ai");
    if (limited) return limited;

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

    // ── Retrieve career memories for evidence-based suggestions ──
    let memoriesContext = "";
    try {
      const memories = await memoryService.searchMemories(user.id, jobDescription, 5);
      if (memories.length > 0) {
        memoriesContext = `\n\nCandidate's verified career memories (use ONLY for evidence-based suggestions — do NOT fabricate):\n${memories
          .map((m) => `[${m.type}] ${m.title}: ${m.content}`)
          .join("\n")}`;
      }
    } catch (err) {
      logger.warn({ err, userId: user.id }, "[optimize-resume] Memory retrieval failed — continuing without memories.");
    }

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
Job Description: ${jobDescription}${memoriesContext}
`;

    const fallbackResult = {
      optimizedResume: resumeData || {},
      atsScore: 70,
      missingKeywords: [],
      improvements: ["Review skills list directly for maximum ATS score increase."],
      rewrittenBullets: [],
      matchAnalysis: "Tailored review completed. Recommended adjustments are shown below."
    };

    const validatedResult = await geminiJSON({
      system: "You are an expert ATS optimizer and career coach.",
      user: prompt,
      schema: responseSchema,
      fallback: fallbackResult,
      model: "gemini-2.5-flash",
    });

    // Track Usage
    await prisma.aIUsage.create({
      data: {
        userId: user.id,
        provider: "google",
        model: "gemini-2.5-flash",
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0.001,
      }
    });

    return NextResponse.json(validatedResult);
  } catch (error) {
    return errorToResponse(error);
  }
}
