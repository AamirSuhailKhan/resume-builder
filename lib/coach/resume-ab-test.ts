import type { Application } from "@prisma/client";
import type { ResumeAbTestResult } from "@/lib/coach/types";

interface ResumeMeta {
  id: string;
  title: string;
  version: number;
}

export function computeResumeAbTest(
  applications: Application[],
  resumes: ResumeMeta[]
): ResumeAbTestResult[] {
  const resumeMap = new Map(resumes.map((r) => [r.id, r]));
  const grouped = new Map<string, Application[]>();

  for (const app of applications) {
    if (!app.resumeId) continue;
    const list = grouped.get(app.resumeId) ?? [];
    list.push(app);
    grouped.set(app.resumeId, list);
  }

  const results: ResumeAbTestResult[] = [];

  for (const [resumeId, apps] of grouped) {
    const meta = resumeMap.get(resumeId);
    if (!meta) continue;

    const interviews = apps.filter((a) => a.status === "interview" || a.status === "offer").length;
    const offers = apps.filter((a) => a.status === "offer").length;
    const rejections = apps.filter((a) => a.status === "rejected").length;
    const total = apps.length;
    const interviewRate = total > 0 ? interviews / total : 0;

    results.push({
      resumeId,
      resumeTitle: meta.title,
      version: meta.version,
      applications: total,
      interviews,
      offers,
      rejections,
      interviewRate,
      isWinner: false,
    });
  }

  if (results.length === 0) return results;

  const best = results.reduce((a, b) => (b.interviewRate > a.interviewRate ? b : a));
  if (best.applications >= 2) {
    best.isWinner = true;
  }

  return results.sort((a, b) => b.interviewRate - a.interviewRate);
}
