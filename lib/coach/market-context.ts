import { computeMarketReport } from "@/lib/job-intelligence/market-analyzer";

export async function getMarketContextForRole(targetRole: string | null): Promise<string> {
  try {
    const report = await computeMarketReport();
    if (report.totalJobs === 0) {
      return "Market data: limited job corpus in the system. Advise based on general industry knowledge and flag uncertainty.";
    }

    const topSkills = report.topSkills.slice(0, 8).map((s) => `${s.skill} (${Math.round(s.percentage)}%)`);
    const topTools = report.topTools.slice(0, 5).map((t) => t.skill);

    const roleNote = targetRole
      ? `Target role: ${targetRole}. Align advice to skills commonly required for this type of role.`
      : "No target role set — prompt user to clarify target role in career profile.";

    return [
      roleNote,
      `Market snapshot (${report.totalJobs} jobs analyzed):`,
      `Top in-demand skills: ${topSkills.join(", ") || "n/a"}`,
      `Top tools: ${topTools.join(", ") || "n/a"}`,
      `Seniority mix: ${JSON.stringify(report.seniorityBreakdown)}`,
    ].join("\n");
  } catch {
    return "Market data unavailable — use general market knowledge and say so if asked for specific stats.";
  }
}
