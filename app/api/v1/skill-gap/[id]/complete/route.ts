import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { skillName } = await req.json();
    if (!skillName) {
      return new NextResponse("skillName is required", { status: 400 });
    }

    // Load analysis
    const analysis = await prisma.skillGapAnalysis.findUnique({
      where: { id: params.id },
    });

    if (!analysis) {
      return new NextResponse("Analysis not found", { status: 404 });
    }

    if (analysis.userId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Update completion
    const completedSet = new Set(analysis.completedSkills);
    if (!completedSet.has(skillName)) {
      completedSet.add(skillName);
    }

    const learningPath = Array.isArray(analysis.learningPath) ? analysis.learningPath : [];
    const totalItems = learningPath.length;
    const progressPct = totalItems > 0 ? (completedSet.size / totalItems) * 100 : 0;

    const updated = await prisma.skillGapAnalysis.update({
      where: { id: analysis.id },
      data: {
        completedSkills: Array.from(completedSet),
        progressPct: Math.min(progressPct, 100),
      },
    });

    // Note: Future trigger -> if skill not in resume.data.skills, create a suggestion.
    // This connects to the Memory/Execution layer later.

    return NextResponse.json({ analysis: updated });
  } catch (error) {
    console.error("[SKILL_GAP_COMPLETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
