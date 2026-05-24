import { prisma } from "./prisma";

/**
 * Fetches all applications for the user, sorted by updatedAt descending.
 * We will filter and map these client-side/API-side.
 */
export async function getUserApplicationsWithStatus(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Fetches the last updated timestamp of the user's resumes.
 */
export async function getResumeLastUpdated(userId: string) {
  return prisma.resume.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
}

/**
 * Fetches the user's skill gap analyses.
 */
export async function getPendingSkillGaps(userId: string) {
  return prisma.skillGapAnalysis.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Fetches applications that are in the "interview" status.
 */
export async function getUpcomingInterviews(userId: string) {
  return prisma.application.findMany({
    where: {
      userId,
      status: "interview",
    },
    orderBy: { updatedAt: "desc" },
  });
}
