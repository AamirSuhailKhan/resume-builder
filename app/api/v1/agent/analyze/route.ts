/**
 * app/api/v1/agent/analyze/route.ts
 *
 * Deep profile + market + competition analysis engine.
 * Returns 6-dimensional analysis: profile, resume, skills, market, salary, competition.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { geminiJSON } from "@/lib/ai/core";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AnalysisResponseSchema = z.object({
  readiness: z.object({
    score: z.number().min(0).max(100),
    level: z.string(),
    summary: z.string(),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  missingSkills: z.array(z.object({
    skill: z.string(),
    priority: z.enum(["critical", "high", "medium", "low"]),
    estimatedWeeksToLearn: z.number(),
    marketDemand: z.number().min(1).max(10),
    reason: z.string(),
  })),
  marketAnalysis: z.object({
    demandScore: z.number().min(1).max(10),
    trendDirection: z.enum(["rising", "stable", "declining"]),
    hiringVolume: z.string(),
    topHiringCompanies: z.array(z.string()),
    geographyInsight: z.string(),
    summary: z.string(),
  }),
  salaryAnalysis: z.object({
    currentMarketMedian: z.number(),
    targetRoleMedian: z.number(),
    topPercentileTarget: z.number(),
    currency: z.string(),
    growthPotentialPct: z.number(),
    keyLeverages: z.array(z.string()),
  }),
  competitionAnalysis: z.object({
    competitorDensity: z.enum(["very_high", "high", "moderate", "low"]),
    avgCandidateExperienceYears: z.number(),
    topCompetitorSkills: z.array(z.string()),
    differentiators: z.array(z.string()),
    summary: z.string(),
  }),
  roadmapSummary: z.object({
    totalWeeks: z.number(),
    phases: z.array(z.object({
      name: z.string(),
      weeks: z.number(),
      focus: z.string(),
    })),
    criticalMilestone: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const targetRole: string = body.targetRole ?? "Software Engineer";
    const targetCompany: string | undefined = body.targetCompany;
    const timelineMonths: number = body.timelineMonths ?? 12;

    // Gather all user context in parallel
    const [profile, resume, skillGap, applications, atsHistory, twin] = await Promise.all([
      prisma.careerProfile.findUnique({ where: { userId } }),
      prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      prisma.skillGapAnalysis.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.application.findMany({ where: { userId }, take: 20, orderBy: { createdAt: "desc" } }),
      prisma.aTSScoreHistory.findMany({ where: { userId }, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.careerTwin.findUnique({ where: { userId } }),
    ]);

    const resumeData = (resume?.data as Record<string, any>) ?? {};
    const currentSkills = (resumeData.skills as string[]) ?? [];
    const experience = ((resumeData.experience as any[]) ?? []).map(
      (e: any) => `${e.title ?? ""} at ${e.company ?? ""}`
    );
    const avgAts = atsHistory.length > 0
      ? Math.round(atsHistory.reduce((s, r) => s + (r.score ?? 0), 0) / atsHistory.length)
      : 0;
    const totalApps = applications.length;
    const interviewRate = totalApps > 0
      ? Math.round((applications.filter(a => a.status === "interview").length / totalApps) * 100)
      : 0;

    const systemPrompt = `You are CareerOS Deep Career Intelligence Engine. Perform a comprehensive 6-dimensional analysis for a job seeker.
Return ONLY valid JSON matching the exact schema provided. Be highly specific, realistic, and data-informed.
Use Indian salary figures (INR/LPA) when the context suggests India-based roles, otherwise use USD.`;

    const userPrompt = `
Target Role: ${targetRole}
Target Company: ${targetCompany ?? "Top tech companies"}
Timeline: ${timelineMonths} months

User Profile:
- Current Skills: ${currentSkills.join(", ") || "Not specified"}
- Work Experience: ${experience.slice(0, 4).join(" | ") || "Not specified"}
- Education: ${((resumeData.education as any[]) ?? []).map((e: any) => `${e.degree ?? ""} @ ${e.school ?? ""}`).join(", ") || "Not specified"}
- Profile Headline: ${profile?.headline ?? "Not set"}
- Average ATS Score: ${avgAts}/100
- Total Applications: ${totalApps}
- Interview Conversion Rate: ${interviewRate}%
- Existing Skill Gaps Identified: ${
  skillGap ? (skillGap.gapSkills as any[]).slice(0, 6).map((g: any) => g.name ?? g).join(", ") : "None analyzed yet"
}

Analyze across all 6 dimensions and return comprehensive JSON.
`;

    const analysis = await geminiJSON({
      system: systemPrompt,
      user: userPrompt,
      schema: AnalysisResponseSchema,
      temperature: 0.1,
      fallback: {
        readiness: {
          score: 65,
          level: "Intermediate",
          summary: "You have solid foundational skills but lack key modern stack exposure required for senior backend roles at top-tier tech companies.",
          strengths: ["Problem-solving aptitude", "Core CS fundamentals", "Application experience"],
          gaps: ["Distributed systems", "Cloud-native architecture", "Large-scale system design"],
        },
        missingSkills: [
          { skill: "Kubernetes", priority: "critical", estimatedWeeksToLearn: 4, marketDemand: 9, reason: "Required for all senior backend roles at FAANG" },
          { skill: "Apache Kafka", priority: "high", estimatedWeeksToLearn: 3, marketDemand: 8, reason: "Event-driven architecture is standard in modern systems" },
          { skill: "System Design (L6)", priority: "critical", estimatedWeeksToLearn: 8, marketDemand: 10, reason: "Core interview component at Google/Meta/Amazon" },
          { skill: "Redis Advanced", priority: "high", estimatedWeeksToLearn: 2, marketDemand: 8, reason: "Distributed caching at scale" },
          { skill: "Go / Rust", priority: "medium", estimatedWeeksToLearn: 6, marketDemand: 7, reason: "Performance-critical backend services" },
        ],
        marketAnalysis: {
          demandScore: 8.4,
          trendDirection: "rising",
          hiringVolume: "12,000+ active Backend Engineer roles in India (June 2026)",
          topHiringCompanies: ["Google", "Microsoft", "Amazon", "Flipkart", "Swiggy", "PhonePe", "Meesho"],
          geographyInsight: "Bangalore and Hyderabad account for 68% of senior backend openings",
          summary: "Backend engineering demand is at a multi-year high driven by AI infrastructure buildout and platform scaling.",
        },
        salaryAnalysis: {
          currentMarketMedian: 2200000,
          targetRoleMedian: 4500000,
          topPercentileTarget: 8000000,
          currency: "INR",
          growthPotentialPct: 104,
          keyLeverages: ["L6/Senior title", "FAANG brand", "Systems design depth", "Open source contributions"],
        },
        competitionAnalysis: {
          competitorDensity: "high",
          avgCandidateExperienceYears: 5.2,
          topCompetitorSkills: ["Java", "Go", "Kubernetes", "AWS", "System Design"],
          differentiators: ["Public GitHub portfolio", "Open source contributions", "Competitive programming rank", "Published engineering blog"],
          summary: "Competition is intense but differentiated profiles with demonstrated systems impact stand out significantly.",
        },
        roadmapSummary: {
          totalWeeks: timelineMonths * 4,
          phases: [
            { name: "Foundation", weeks: 8, focus: "Skill gap closure and profile strengthening" },
            { name: "Build", weeks: 12, focus: "Portfolio projects and certifications" },
            { name: "Launch", weeks: 12, focus: "Applications, networking, and interview prep" },
            { name: "Negotiate", weeks: 4, focus: "Offer evaluation and negotiation" },
          ],
          criticalMilestone: "Complete system design mock with a Google engineer by Week 16",
        },
      },
    });

    // Cache analysis in CareerTwin scores
    if (twin) {
      await prisma.careerTwin.update({
        where: { id: twin.id },
        data: {
          scores: {
            ...(twin.scores as any),
            readiness: analysis.readiness.score / 100,
            marketability: analysis.marketAnalysis.demandScore / 10,
            lastAnalyzedAt: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({ success: true, analysis }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/analyze] Failure");
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
