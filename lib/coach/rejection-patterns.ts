import type { Application } from "@prisma/client";
import type { RejectionPatternAnalysis } from "@/lib/coach/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function analyzeRejectionPatterns(applications: Application[]): RejectionPatternAnalysis {
  const now = Date.now();
  const rejected = applications.filter((a) => a.status === "rejected");
  const total = applications.length;
  const rejectionsLast30Days = rejected.filter(
    (a) => now - a.updatedAt.getTime() <= THIRTY_DAYS_MS
  ).length;

  const companyCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const daysToReject: number[] = [];

  for (const app of rejected) {
    companyCounts.set(app.company, (companyCounts.get(app.company) ?? 0) + 1);
    roleCounts.set(app.role, (roleCounts.get(app.role) ?? 0) + 1);
    if (app.appliedAt) {
      daysToReject.push(daysBetween(app.appliedAt, app.updatedAt));
    }
  }

  const topRejectedCompanies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([company, count]) => ({ company, count }));

  const topRejectedRoles = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([role, count]) => ({ role, count }));

  const rejectionRate = total > 0 ? rejected.length / total : 0;
  const avgDaysToRejection =
    daysToReject.length > 0
      ? Math.round((daysToReject.reduce((s, d) => s + d, 0) / daysToReject.length) * 10) / 10
      : null;

  const likelyCauses: string[] = [];
  if (rejectionRate > 0.6) likelyCauses.push("High overall rejection rate — resume or targeting may be misaligned");
  if (avgDaysToRejection !== null && avgDaysToRejection < 3) {
    likelyCauses.push("Fast rejections — likely ATS or keyword mismatch");
  }
  if (avgDaysToRejection !== null && avgDaysToRejection > 14) {
    likelyCauses.push("Slow rejections — may indicate experience level mismatch after human review");
  }
  if (topRejectedCompanies.length === 1 && topRejectedCompanies[0]!.count >= 3) {
    likelyCauses.push(`Repeated rejections at ${topRejectedCompanies[0]!.company} — company-specific bar or referral gap`);
  }

  let patternSummary = "Not enough application data to identify patterns yet.";
  if (rejected.length >= 3) {
    const topCo = topRejectedCompanies[0]?.company ?? "various companies";
    patternSummary = `${rejected.length} rejections (${Math.round(rejectionRate * 100)}% rate). ${rejectionsLast30Days} in the last 30 days. Most rejections from ${topCo}.`;
  }

  return {
    totalApplications: total,
    rejectedCount: rejected.length,
    rejectionRate,
    rejectionsLast30Days,
    topRejectedCompanies,
    topRejectedRoles,
    avgDaysToRejection,
    patternSummary,
    likelyCauses,
  };
}
