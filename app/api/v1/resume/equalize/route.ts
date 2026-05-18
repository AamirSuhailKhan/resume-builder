import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import { detectCollegeTier } from "@/lib/data/tier1-colleges";

export const runtime = "nodejs";

const schema = z.object({
  resumeId: z.string().uuid(),
  targetRole: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

    const { resumeId, targetRole } = parsed.data;

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, userId },
    });

    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

    const data = resume.data as any;
    const education = data.education?.[0];
    const collegeName = education?.institution || "";
    
    const tier = detectCollegeTier(collegeName);

    if (tier === 'tier1') {
      return NextResponse.json({
        tier: 'tier1',
        message: 'Your college is well-recognized. Focus on quantifying your impact and projects.',
        suggestion: null
      });
    }

    const systemPrompt = `You are an expert resume strategist specializing in "opportunity signal optimization". Help candidates from non-IIT/NIT colleges compete by re-ordering and rewriting their resume to emphasize skills and impact over education to counter ATS and recruiter bias. 
    
Return ONLY valid JSON matching this schema:
{
  "suggestedFormat": "skills_first",
  "summaryRewrite": "string (no mention of college, 100% skills and impact focused)",
  "skillsSectionBoost": "string (expanded skills section format or content to display prominently)",
  "educationDeEmphasis": "string (factual but de-emphasized education entry)",
  "projectHighlights": [{ "experienceId": "string", "rewrittenPoints": ["string"] }],
  "rationale": "string (WHY these sections changed. e.g., 'Moved projects above education because recruiters spend more time on measurable impact signals. This format puts your skills front and center.')",
  "signalDensity": "string (e.g., 'Current resume: 40% space spent on low-signal content. High-impact content underrepresented...')",
  "attentionGain": number (e.g., 28 for +28% estimated recruiter attention gain)
}

CRITICAL RULES:
1. NEVER fabricate achievements, inflate titles, or invent metrics.
2. NEVER hide education entirely.
3. ONLY reorder, rewrite for clarity, emphasize evidence, and improve signal hierarchy.
4. Your rationale must explain WHY the changes improve recruiter signal tracking.`;

    const userPrompt = `Resume data: ${JSON.stringify(data)}. 
Target role: ${targetRole}. 
College: ${collegeName} (tier ${tier}). 
The resume currently leads with education — this creates unconscious bias. Generate skill-first rewrites according to the schema.`;

    const { data: suggestionData } = await callClaudeJson<any>({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 3000,
    });

    const suggestion = await prisma.resumeEqualizerSuggestion.create({
      data: {
        resumeId,
        userId,
        collegeName,
        collegeTier: tier,
        suggestedFormat: suggestionData.suggestedFormat || "skills_first",
        summaryRewrite: suggestionData.summaryRewrite,
        skillsSectionBoost: suggestionData.skillsSectionBoost,
        educationDeEmphasis: suggestionData.educationDeEmphasis,
        projectHighlights: suggestionData.projectHighlights || [],
        rationale: suggestionData.rationale || "Optimized signal hierarchy to prioritize impact.",
        signalDensity: suggestionData.signalDensity || null,
        attentionGain: suggestionData.attentionGain || null,
      }
    });
    
    return NextResponse.json({
      tier,
      message: 'AI detected opportunity for skill-first repositioning.',
      suggestion,
    });

  } catch (error: any) {
    console.error("[Equalizer API Error]:", error);
    return NextResponse.json({ error: "Failed to generate equalizer suggestion." }, { status: 500 });
  }
}
