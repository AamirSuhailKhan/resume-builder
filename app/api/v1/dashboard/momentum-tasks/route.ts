import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import type { MomentumTask, MomentumTaskType } from "@/types/momentum";
import {
  getUserApplicationsWithStatus,
  getResumeLastUpdated,
  getPendingSkillGaps,
} from "@/lib/db/momentum";

export const runtime = "nodejs";

// Helper function to get cached momentum data partitioned by userId
const getCachedMomentumData = (userId: string) =>
  unstable_cache(
    async () => {
      const [applications, latestResume, skillGaps, jobOpportunities] = await Promise.all([
        getUserApplicationsWithStatus(userId),
        getResumeLastUpdated(userId),
        getPendingSkillGaps(userId),
        prisma.jobOpportunity.findMany({
          where: { userId },
          orderBy: { matchScore: "desc" },
          take: 5,
        }),
      ]);
      return { applications, latestResume, skillGaps, jobOpportunities };
    },
    [`momentum-tasks-${userId}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: [`momentum-tasks-${userId}`],
    }
  )();

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const salaryBenchmarkViewed = searchParams.get("salaryBenchmarkViewed") === "true";

    // 1. Retrieve Data (either via Cache or direct DB query if forcing refresh)
    let data;
    if (forceRefresh) {
      const [applications, latestResume, skillGaps, jobOpportunities] = await Promise.all([
        getUserApplicationsWithStatus(userId),
        getResumeLastUpdated(userId),
        getPendingSkillGaps(userId),
        prisma.jobOpportunity.findMany({
          where: { userId },
          orderBy: { matchScore: "desc" },
          take: 5,
        }),
      ]);
      data = { applications, latestResume, skillGaps, jobOpportunities };
    } else {
      data = await getCachedMomentumData(userId);
    }

    const { applications, latestResume, skillGaps, jobOpportunities } = data;
    const tasks: MomentumTask[] = [];

    // 2. PRIORITY GENERATION LOGIC

    // Rule 1: Interview Scheduled (status === 'interview')
    const interviewApps = applications.filter((a) => a.status === "interview");
    if (interviewApps.length > 0) {
      const app = interviewApps[0];
      if (app) {
        // Assume interview is 5 days away from updatedAt if not specified
        const daysUntil = Math.max(
          1,
          Math.ceil((app.updatedAt.getTime() + 5 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
        );
        tasks.push({
          id: `interview-${app.id}`,
          text: `Prep for your ${app.company} interview — ${daysUntil} days away`,
          priority: "urgent",
          link: "/interview",
          icon: "Calendar",
          type: "interview",
        });
      }
    }

    // Rule 2: Applied with no response for >= 7 days
    const appliedApps = applications.filter((a) => a.status === "applied");
    const silenceThreshold = 7 * 24 * 60 * 60 * 1000;
    const silentApp = appliedApps.find((a) => Date.now() - a.updatedAt.getTime() >= silenceThreshold);
    if (silentApp) {
      const daysSince = Math.floor((Date.now() - silentApp.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
      tasks.push({
        id: `followup-${silentApp.id}`,
        text: `Follow up on ${silentApp.company} application — ${daysSince} days of silence`,
        priority: "urgent",
        link: "/applications",
        icon: "MessageSquare",
        type: "followup",
      });
    }

    // Rule 3: No applications in last 14 days
    const lastApplication = applications[0];
    const fourteenDaysAgo = 14 * 24 * 60 * 60 * 1000;
    const hasRecentApp = lastApplication && Date.now() - lastApplication.updatedAt.getTime() < fourteenDaysAgo;
    if (!lastApplication || !hasRecentApp) {
      const daysSince = lastApplication
        ? Math.floor((Date.now() - lastApplication.updatedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 14; // Default to 14 if never applied
      tasks.push({
        id: "no-applications",
        text: `You haven't applied in ${daysSince} days — apply to 3 roles today`,
        priority: "normal",
        link: "/matches",
        icon: "Briefcase",
        type: "apply",
      });
    }

    // Rule 4: Resume hasn't been updated in > 30 days
    const thirtyDaysAgo = 30 * 24 * 60 * 60 * 1000;
    if (latestResume && Date.now() - latestResume.updatedAt.getTime() > thirtyDaysAgo) {
      const daysSince = Math.floor((Date.now() - latestResume.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
      tasks.push({
        id: "resume-outdated",
        text: `Your resume is ${daysSince} days old — refresh metrics before applying`,
        priority: "normal",
        link: "/builder",
        icon: "FileText",
        type: "resume",
      });
    }

    // Rule 5: Offer received (status === 'offer')
    const offerApps = applications.filter((a) => a.status === "offer");
    if (offerApps.length > 0) {
      const app = offerApps[0];
      if (app) {
        const deadlineDate = new Date(app.updatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const deadline = deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        tasks.push({
          id: `offer-${app.id}`,
          text: `You have an offer from ${app.company} — use Salary Intelligence to negotiate before ${deadline}`,
          priority: "urgent",
          link: "/compare-offers",
          icon: "Award",
          type: "offer",
        });
      }
    }

    // Rule 6: No salary benchmark viewed in current session
    if (!salaryBenchmarkViewed) {
      let topCompany = "Atlassian";
      if (jobOpportunities.length > 0 && jobOpportunities[0]) {
        topCompany = jobOpportunities[0].company;
      } else if (applications.length > 0 && applications[0]) {
        topCompany = applications[0].company;
      }
      tasks.push({
        id: "salary-benchmark",
        text: `Check SDE2 salaries at ${topCompany} — updated this week`,
        priority: "normal",
        link: "/salary-intelligence",
        icon: "TrendingUp",
        type: "salary",
      });
    }

    // Rule 7: Skill gaps identified but not acted on
    const pendingGapAnalysis = skillGaps.find((g) => {
      const gap = Array.isArray(g.gapSkills) ? g.gapSkills : [];
      const completed = Array.isArray(g.completedSkills) ? g.completedSkills : [];
      return gap.length > completed.length;
    });
    if (pendingGapAnalysis) {
      const gap = Array.isArray(pendingGapAnalysis.gapSkills) ? pendingGapAnalysis.gapSkills : [];
      const completed = Array.isArray(pendingGapAnalysis.completedSkills) ? pendingGapAnalysis.completedSkills : [];
      const missingCount = gap.length - completed.length;
      tasks.push({
        id: "skill-gaps",
        text: `${missingCount} skills in your JDs are missing from your resume`,
        priority: "normal",
        link: "/skill-gap",
        icon: "Brain",
        type: "skill_gap",
      });
    }

    // Rule 8: Fallback (New user / no other tasks triggered)
    if (tasks.length === 0) {
      tasks.push({
        id: "fallback-onboarding",
        text: "Add your first target role to unlock personalized tasks",
        priority: "normal",
        link: "/onboarding",
        icon: "Sparkles",
        type: "fallback",
      });
    }

    // Return the prioritized list (unfiltered - client side handles mood filtering)
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[MOMENTUM_TASKS_API]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
