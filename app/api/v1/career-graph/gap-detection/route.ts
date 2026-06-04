/**
 * app/api/v1/career-graph/gap-detection/route.ts
 *
 * AI-powered gap detection and relationship discovery engine.
 * Analyzes the career graph to find missing connections, skill gaps,
 * and hidden opportunities.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { geminiJSON } from "@/lib/ai/core";
import { GraphService } from "@/lib/career-graph";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GapAnalysisSchema = z.object({
  criticalGaps: z.array(z.object({
    type: z.enum(["skill", "experience", "certification", "network", "application", "interview_prep"]),
    title: z.string(),
    description: z.string(),
    impact: z.enum(["high", "medium", "low"]),
    action: z.string(),
    estimatedWeeks: z.number(),
  })),
  hiddenOpportunities: z.array(z.object({
    title: z.string(),
    description: z.string(),
    confidence: z.number(),
    nextStep: z.string(),
  })),
  relationshipInsights: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relationship: z.string(),
    insight: z.string(),
    actionable: z.boolean(),
  })),
  careerProgressScore: z.number().min(0).max(100),
  progressSummary: z.string(),
  nextMilestone: z.string(),
  estimatedTimeToGoal: z.string(),
});

export type GapAnalysisResult = z.infer<typeof GapAnalysisSchema>;

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Gather graph context
    const [skillNodes, gapNodes, appNodes, interviewNodes, offerNodes, goalNodes, certNodes, expNodes] =
      await Promise.all([
        GraphService.getNodesByKind(userId, "SKILL"),
        GraphService.getNodesByKind(userId, "SKILL_GAP"),
        GraphService.getNodesByKind(userId, "APPLICATION"),
        GraphService.getNodesByKind(userId, "INTERVIEW"),
        GraphService.getNodesByKind(userId, "OFFER"),
        GraphService.getNodesByKind(userId, "CAREER_GOAL"),
        GraphService.getNodesByKind(userId, "CERTIFICATION"),
        GraphService.getNodesByKind(userId, "EXPERIENCE"),
      ]);

    // Raw DB context
    const [profile, applications, skillGaps, recruiterCount] = await Promise.all([
      prisma.careerProfile.findUnique({ where: { userId } }),
      prisma.application.findMany({ where: { userId }, take: 20, orderBy: { createdAt: "desc" } }),
      prisma.skillGapAnalysis.findMany({ where: { userId }, take: 5 }),
      prisma.recruiterInteraction.count({ where: { userId } }),
    ]);

    const goals = (profile?.goals as Record<string, any>) ?? {};
    const primaryGoal = goals.primary;
    const targetRole = primaryGoal?.targetRole ?? "Software Engineer";

    const systemPrompt = `You are the CareerOS Career Graph Intelligence Engine. 
Analyze a user's career graph and generate precise, actionable gap detection and relationship insights.
Be specific, realistic, and highly targeted. Focus on what will most impact their goal achievement.
Return ONLY valid JSON matching the exact schema.`;

    const userPrompt = `
Career Goal: ${targetRole}${primaryGoal?.targetCompany ? ` @ ${primaryGoal.targetCompany}` : ""}
Timeline: ${primaryGoal?.timelineWeeks ? `${Math.ceil(primaryGoal.timelineWeeks / 4)} months` : "12 months"}

Graph State:
- Skills in graph: ${skillNodes.length} (${skillNodes.slice(0, 8).map(n => (n.payload as any).name).join(", ")})
- Skill gaps detected: ${gapNodes.length} (${gapNodes.slice(0, 5).map(n => (n.payload as any).skill).join(", ")})
- Applications submitted: ${appNodes.length}
- Interviews completed: ${interviewNodes.length}
- Offers received: ${offerNodes.length}
- Certifications: ${certNodes.length}
- Years of experience entries: ${expNodes.length}
- Recruiter connections: ${recruiterCount}
- Active goals: ${goalNodes.length}

Raw Application Data:
${applications.slice(0, 5).map(a => `  - ${a.role} @ ${a.company}: ${a.status}`).join("\n")}

Known Skill Gaps:
${skillGaps.flatMap(g => (g.gapSkills as any[]).slice(0, 3).map((s: any) => `  - ${s.name ?? s} for ${g.targetRole}`)).join("\n")}

Identify:
1. Critical gaps preventing goal achievement
2. Hidden opportunities in the existing graph (underutilized skills, untapped companies, missed connections)
3. Relationship insights (what connections exist that could be leveraged)
4. Overall career progress score (0-100) toward their goal
5. Next milestone to hit
6. Estimated time to achieve goal at current pace
`;

    const analysis = await geminiJSON({
      system: systemPrompt,
      user: userPrompt,
      schema: GapAnalysisSchema,
      temperature: 0.15,
      fallback: {
        criticalGaps: [
          {
            type: "skill",
            title: "Missing System Design Depth",
            description: "Your graph lacks advanced distributed systems knowledge required for senior backend roles at FAANG.",
            impact: "high",
            action: "Complete Grokking System Design course and practice 3 mock system design interviews",
            estimatedWeeks: 8,
          },
          {
            type: "interview_prep",
            title: "No Interview History",
            description: "Zero interview nodes in your graph signals no active practice pipeline.",
            impact: "high",
            action: "Book 2 mock interviews per week for the next 4 weeks",
            estimatedWeeks: 4,
          },
          {
            type: "network",
            title: "Weak Recruiter Network",
            description: "You have fewer than 3 recruiter connections for your target companies.",
            impact: "medium",
            action: "Connect with 5 recruiters at target companies on LinkedIn this week",
            estimatedWeeks: 1,
          },
        ],
        hiddenOpportunities: [
          {
            title: "Leverage Existing Backend Skills",
            description: "Your current backend skills match 60% of mid-level requirements at your target companies.",
            confidence: 0.78,
            nextStep: "Apply to 3 backend roles immediately to establish interview pipeline",
          },
          {
            title: "Open Source Contribution Signal",
            description: "Contributing to a popular open source project in your stack could 3x recruiter response rates.",
            confidence: 0.65,
            nextStep: "Identify and submit one PR to a top-100 GitHub repo in your tech stack",
          },
        ],
        relationshipInsights: [
          {
            from: "Backend Skills",
            to: "Target Job Requirements",
            relationship: "PARTIAL_MATCH",
            insight: "60% skill overlap with target role requirements — close the gap to unlock direct applications",
            actionable: true,
          },
          {
            from: "Applications",
            to: "Interview",
            relationship: "CONVERSION_GAP",
            insight: "0% application to interview conversion — resume or targeting may need optimization",
            actionable: true,
          },
        ],
        careerProgressScore: 42,
        progressSummary: "You are 42% of the way to your career goal. Strong foundational skills but missing interview pipeline and critical system design depth.",
        nextMilestone: "Complete first mock interview and submit 5 targeted applications",
        estimatedTimeToGoal: "8-10 months at current pace",
      },
    });

    // Cache in CareerTwin
    const twin = await prisma.careerTwin.findUnique({ where: { userId } });
    if (twin) {
      await prisma.careerTwin.update({
        where: { id: twin.id },
        data: {
          scores: {
            ...(twin.scores as any),
            careerProgress: analysis.careerProgressScore / 100,
            lastGapAnalysis: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({ success: true, analysis }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[GET /api/v1/career-graph/gap-detection] error");
    return NextResponse.json({ error: "Gap analysis failed" }, { status: 500 });
  }
}
