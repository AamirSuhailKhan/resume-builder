import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const schema = z.object({
  resumeId: z.string().uuid(),
  suggestionId: z.string().uuid(),
  applyFields: z.array(z.enum(['summary', 'skills', 'education', 'projects'])),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

    const { resumeId, suggestionId, applyFields } = parsed.data;

    if (applyFields.length === 0) {
      return NextResponse.json({ error: "No fields selected to apply" }, { status: 400 });
    }

    const [resume, suggestion] = await Promise.all([
      prisma.resume.findUnique({ where: { id: resumeId, userId } }),
      prisma.resumeEqualizerSuggestion.findUnique({ where: { id: suggestionId, userId, resumeId } }),
    ]);

    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

    // Create a new version of the resume before modifying
    const latestVersion = await prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { version: 'desc' }
    });
    
    const nextVersionNum = (latestVersion?.version || resume.version || 1) + 1;

    await prisma.resumeVersion.create({
      data: {
        resumeId,
        userId,
        version: nextVersionNum,
        title: `Before Equalization (${new Date().toLocaleString()})`,
        data: resume.data || {},
      }
    });

    const data = JSON.parse(JSON.stringify(resume.data)) as any;

    // Apply rewrites
    if (applyFields.includes('summary') && suggestion.summaryRewrite) {
      if (!data.personal) data.personal = {};
      data.personal.summary = suggestion.summaryRewrite;
    }

    if (applyFields.includes('skills') && suggestion.skillsSectionBoost) {
      // In a real scenario we'd parse or merge, but since the LLM gave a string for skillsSectionBoost,
      // we'll replace the text. Or if it's supposed to be an array:
      // Typically `data.skills` is an array of strings. We could just dump it as a single element or attempt to split it.
      // Assuming skillsSectionBoost is stringified or comma separated.
      data.skills = suggestion.skillsSectionBoost.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (applyFields.includes('education') && suggestion.educationDeEmphasis) {
      if (data.education && data.education.length > 0) {
        data.education[0].institution = suggestion.educationDeEmphasis; 
        // We could overwrite the whole entry but doing simple replacement for this feature prototype.
        // Usually, the LLM will provide a condensed version of the degree.
      }
    }

    if (applyFields.includes('projects') && suggestion.projectHighlights && Array.isArray(suggestion.projectHighlights)) {
      if (data.experience && Array.isArray(data.experience)) {
        suggestion.projectHighlights.forEach((highlight: any) => {
          const expIndex = data.experience.findIndex((e: any) => e.id === highlight.experienceId);
          if (expIndex !== -1 && highlight.rewrittenPoints) {
            data.experience[expIndex].points = highlight.rewrittenPoints;
          }
        });
      }
    }

    // Move projects/experience above education if we're optimizing formatting
    if (applyFields.includes('education') || applyFields.includes('projects')) {
      // Typically handled by a layout property in ResumeData, let's just append a metadata flag
      if (!data.layout) data.layout = {};
      data.layout.sectionOrder = ['personal', 'summary', 'skills', 'experience', 'education'];
    }

    // Save updated resume
    const updatedResume = await prisma.resume.update({
      where: { id: resumeId },
      data: {
        data,
        version: nextVersionNum,
      },
    });

    // Mark as applied
    await prisma.resumeEqualizerSuggestion.update({
      where: { id: suggestionId },
      data: { appliedAt: new Date() },
    });

    return NextResponse.json({ 
      message: "Equalizer applied successfully",
      resume: updatedResume
    });

  } catch (error: any) {
    console.error("[Equalizer Apply Error]:", error);
    return NextResponse.json({ error: "Failed to apply equalizer suggestion." }, { status: 500 });
  }
}
