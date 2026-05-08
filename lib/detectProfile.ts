/**
 * detectProfile — Auto-detects the user's career profile from resume data.
 *
 * No dropdown. No user input. Pure signal inference.
 */

const TECH_KEYWORDS = [
  "react", "next.js", "nextjs", "angular", "vue", "svelte",
  "typescript", "javascript", "python", "java", "golang", "rust",
  "node", "django", "flask", "fastapi", "spring",
  "sql", "postgresql", "mongodb", "redis", "graphql",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
  "git", "ci/cd", "devops", "machine learning", "ai", "llm",
];

const NON_TECH_KEYWORDS = [
  "marketing", "sales", "hr", "human resources", "finance", "accounting",
  "operations", "supply chain", "logistics", "customer success",
  "business development", "content", "seo", "social media",
  "product management", "project management", "consulting",
];

const LEADERSHIP_TITLES = [
  "manager", "director", "head of", "vp", "vice president",
  "lead", "principal", "staff", "architect", "cto", "ceo", "founder",
  "senior", "sr.", "sr ",
];

export interface DetectedProfile {
  level: "Fresher" | "Mid-Level" | "Senior";
  domain: "Tech" | "Non-Tech" | "Mixed";
  yearsOfExperience: number;
  inferredRole: string;
  tagline: string;
}

type ResumeExperienceSignal = {
  role?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
};

type ResumeProfileInput = {
  experience?: unknown;
  skills?: unknown;
};

function calcYearsFromExperience(experience: ResumeExperienceSignal[]): number {
  let totalMonths = 0;
  const now = new Date();

  for (const exp of experience) {
    const start = exp.startDate ? new Date(exp.startDate) : null;
    const end = exp.endDate
      ? exp.endDate.toLowerCase() === "present"
        ? now
        : new Date(exp.endDate)
      : now;

    if (start && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diff =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      if (diff > 0) totalMonths += diff;
    }
  }

  return Math.round(totalMonths / 12);
}

function inferDomain(
  skills: string[],
  experience: { role?: string; company?: string }[]
): "Tech" | "Non-Tech" | "Mixed" {
  const blob = [
    ...skills,
    ...experience.map((e) => `${e.role || ""} ${e.company || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const techScore = TECH_KEYWORDS.filter((kw) => blob.includes(kw)).length;
  const nonTechScore = NON_TECH_KEYWORDS.filter((kw) => blob.includes(kw)).length;

  if (techScore > nonTechScore * 1.5) return "Tech";
  if (nonTechScore > techScore * 1.5) return "Non-Tech";
  return "Mixed";
}

function inferRole(
  experience: { role?: string }[],
  skills: string[]
): string {
  // Use the most recent role title
  const latestRole = experience[0]?.role;
  if (latestRole && latestRole.trim()) return latestRole.trim();

  // Fall back to skill-based heuristic
  const skillBlob = skills.join(" ").toLowerCase();
  if (skillBlob.includes("react") || skillBlob.includes("next")) return "Frontend Developer";
  if (skillBlob.includes("python") || skillBlob.includes("django")) return "Backend Developer";
  if (skillBlob.includes("devops") || skillBlob.includes("kubernetes")) return "DevOps Engineer";
  if (skillBlob.includes("data") || skillBlob.includes("machine learning")) return "Data Scientist";
  if (skillBlob.includes("marketing")) return "Marketing Specialist";
  if (skillBlob.includes("hr") || skillBlob.includes("recruiter")) return "HR Professional";

  return "Professional";
}

function inferLevel(
  years: number,
  experience: { role?: string }[]
): "Fresher" | "Mid-Level" | "Senior" {
  const roleBlob = experience.map((e) => e.role || "").join(" ").toLowerCase();
  const hasLeadershipTitle = LEADERSHIP_TITLES.some((t) => roleBlob.includes(t));

  if (hasLeadershipTitle || years >= 5) return "Senior";
  if (years >= 2) return "Mid-Level";
  return "Fresher";
}

function buildTagline(
  level: DetectedProfile["level"],
  domain: DetectedProfile["domain"],
  role: string
): string {
  if (level === "Fresher") {
    return `Optimized for Entry-Level ${domain === "Tech" ? "Tech" : ""} Roles`;
  }
  if (level === "Senior") {
    return `Optimized for Senior ${role} Opportunities`;
  }
  return `Optimized for ${role} Positions`;
}

export function detectProfile(resume: ResumeProfileInput): DetectedProfile {
  const experience: ResumeExperienceSignal[] = Array.isArray(resume?.experience)
    ? resume.experience.map((item) => item && typeof item === "object" ? item as ResumeExperienceSignal : {})
    : [];
  const rawSkills: unknown = resume?.skills ?? [];
  const skills: string[] = Array.isArray(rawSkills) ? rawSkills : String(rawSkills).split(",");

  const yearsOfExperience = calcYearsFromExperience(experience);
  const domain = inferDomain(skills, experience);
  const inferredRole = inferRole(experience, skills);
  const level = inferLevel(yearsOfExperience, experience);
  const tagline = buildTagline(level, domain, inferredRole);

  return { level, domain, yearsOfExperience, inferredRole, tagline };
}
