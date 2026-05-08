import { JobMatchDashboard } from "@/features/jobs/JobMatchDashboard";
import { JobsService } from "@/lib/services/jobs.service";
import { JobMatch } from "@/features/platform/data";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  
  const opportunities = await JobsService.getOpportunitiesForUser(session.user.id);
  
  const mappedJobs: JobMatch[] = opportunities.map(job => {
    const parsed = typeof job.parsed === "object" && job.parsed !== null && !Array.isArray(job.parsed)
      ? job.parsed as { skills?: unknown; missing?: unknown }
      : {};
    return {
      id: job.id,
      company: job.company,
      role: job.role,
      location: job.location || "Remote",
      salary: job.salaryRange || "Competitive",
      match: job.matchScore,
      stage: job.matchScore >= 90 ? "hot" : job.matchScore >= 70 ? "warm" : "watch",
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
    };
  });

  return <JobMatchDashboard initialJobs={mappedJobs} />;
}
