import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { duckDuckGoSearch } from "@/lib/search/duckduckgo";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { extractUserSkills } from "@/lib/job-intelligence/skill-gap";
import { Prisma } from "@prisma/client";

export const maxDuration = 60; // Allow 60s for AI / DuckDuckGo

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { targetRole, targetCompany } = await req.json();
    if (!targetRole) {
      return new NextResponse("Target role is required", { status: 400 });
    }

    // 1. Auth → load resume
    const resume = await prisma.resume.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    // 2. Extract currentSkills
    const currentSkillsRaw = resume?.data ? extractUserSkills(resume.data as any) : new Set<string>();
    const currentSkills = Array.from(currentSkillsRaw);

    // 3. Search for target role requirements
    const query = `${targetRole} ${targetCompany ?? "top tech company"} required skills job description`;
    const searchResults = await duckDuckGoSearch(query);
    const searchContext = searchResults.map((r) => r.summary).join("\n");

    // 4. Call Claude
    const systemPrompt = "Extract required skills from job descriptions and generate a free learning path. Return ONLY valid JSON.";
    const userPrompt = `Target: ${targetRole}. Current skills: [${currentSkills.join(", ")}]. Research: ${searchContext}. 

Return: { 
  "requiredSkills": [{"name": "string", "confidence": "strong|working|basic|missing", "marketDemandScore": number}], 
  "gapSkills": [{"name": "string", "confidence": "missing", "marketDemandScore": number}], 
  "learningPath": [{"week": number, "skill": "string", "resource": {"title": "string", "url": "string", "type": "string", "durationHours": number, "platform": "string"}, "milestone": "string", "projectIdea": "string"}], 
  "estimatedWeeks": number 
}

Ensure "confidence" is populated appropriately. If the user has a skill, estimate their confidence based on their overall skills, otherwise use "missing". "marketDemandScore" should be 1-10.
For the learning path, include a max of 12 weeks. ONLY include FREE resources. Exclude Udemy coupon links or paid courses. Project ideas should be practical and hands-on.`;

    const { data: aiResult } = await callClaudeJson<any>({
      system: systemPrompt,
      user: userPrompt,
      model: "claude-3-5-haiku-20241022", // Use fast/cheap Haiku model
    });

    // 5. Post-process AI response (filters)
    let learningPath = Array.isArray(aiResult?.learningPath) ? aiResult.learningPath : [];
    // Filter paid keywords and truncate to 12
    learningPath = learningPath
      .filter((item: any) => {
        const url = (item?.resource?.url || "").toLowerCase();
        return !url.includes("udemy.com/?coupon") && !url.includes("coursera.org/learn") /* some are paid, let's just rely on AI mostly but block obvious ones */;
      })
      .slice(0, 12);

    const requiredSkills = Array.isArray(aiResult?.requiredSkills) ? aiResult.requiredSkills : [];
    const gapSkills = Array.isArray(aiResult?.gapSkills) ? aiResult.gapSkills : [];

    // Map currentSkills into Json objects if they aren't already included in requiredSkills
    const requiredSkillNames = new Set(requiredSkills.map((s: any) => s.name?.toLowerCase()));
    const formattedCurrentSkills = currentSkills.map(skill => {
      return {
        name: skill,
        confidence: "working", // default if not specified by AI
        marketDemandScore: 5
      };
    });

    // 6. Upsert Analysis
    const analysis = await prisma.skillGapAnalysis.upsert({
      where: {
        userId_targetRole: {
          userId: session.user.id,
          targetRole,
        },
      },
      create: {
        userId: session.user.id,
        targetRole,
        targetCompany,
        currentSkills: formattedCurrentSkills as Prisma.JsonArray,
        requiredSkills: requiredSkills as Prisma.JsonArray,
        gapSkills: gapSkills as Prisma.JsonArray,
        learningPath: learningPath as Prisma.JsonArray,
        estimatedWeeks: aiResult?.estimatedWeeks || learningPath.length,
        progressPct: 0,
        completedSkills: [],
      },
      update: {
        targetCompany,
        currentSkills: formattedCurrentSkills as Prisma.JsonArray,
        requiredSkills: requiredSkills as Prisma.JsonArray,
        gapSkills: gapSkills as Prisma.JsonArray,
        learningPath: learningPath as Prisma.JsonArray,
        estimatedWeeks: aiResult?.estimatedWeeks || learningPath.length,
        // preserve progress and completedSkills
      },
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[SKILL_GAP_ANALYZE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
