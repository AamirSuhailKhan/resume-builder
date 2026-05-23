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

export interface OnboardingAnalysis {
  score: number;
  fixes: string[];
  strongSkills: string[];
  weakSignals: string[];
}

export function analyzeOnboardingResume(resume: ResumeProfileInput): OnboardingAnalysis {
  const profile = detectProfile(resume);
  const rawSkills: unknown = (resume as any)?.skills ?? [];
  const skills: string[] = Array.isArray(rawSkills) 
    ? rawSkills.map(s => String(s))
    : String(rawSkills).split(",").map(s => s.trim()).filter(Boolean);

  const experience: any[] = Array.isArray((resume as any)?.experience) ? (resume as any).experience : [];
  const education: any[] = Array.isArray((resume as any)?.education) ? (resume as any).education : [];

  // Check for metrics in experience descriptions
  let hasMetrics = false;
  let textBlob = "";
  for (const exp of experience) {
    const roleText = (exp.role || "") + " " + (exp.company || "") + " " + (exp.points || []).join(" ");
    textBlob += " " + roleText;
    if (/[0-9]+%|[0-9]+\s*x|[0-9]+\s*ms|lakh|crore|million|billion|\$[0-9]+/i.test(roleText)) {
      hasMetrics = true;
    }
  }

  // Check for active portfolio or github links
  let hasLinks = false;
  const personal = (resume as any)?.personal || {};
  if (personal.website || personal.linkedin || /github\.com/i.test(textBlob)) {
    hasLinks = true;
  }

  // Check for education tier (non-tier-1 check if possible)
  let isTier1 = false;
  for (const edu of education) {
    const inst = String(edu.institution || "").toLowerCase();
    if (inst.includes("iit") || inst.includes("nit") || inst.includes("bits") || inst.includes("iiit") || inst.includes("technology") || inst.includes("engineering")) {
      isTier1 = true;
    }
  }

  // Calculate dynamic ATS score
  let score = 68;
  if (skills.length > 5) score += 5;
  if (skills.length > 10) score += 3;
  if (experience.length > 0) score += 8;
  if (hasMetrics) score += 8;
  if (hasLinks) score += 5;
  if (isTier1) score += 3;
  
  // Cap score between 45 and 92
  score = Math.max(45, Math.min(92, score));

  // Determine fixes and weak signals
  const fixes: string[] = [];
  const weakSignals: string[] = [];

  // Tech vs Non-Tech
  if (profile.domain === "Tech") {
    // Check for core modern tech stack terms
    const hasModernTools = ["docker", "kubernetes", "aws", "gcp", "ci/cd", "observability", "datadog", "redis", "postgres", "sql"].some(tool => 
      textBlob.toLowerCase().includes(tool) || skills.some(s => s.toLowerCase().includes(tool))
    );

    if (!hasMetrics) {
      fixes.push("Add quantitative impact metrics (e.g. latency reduced by 40%, API costs cut by $12k) to your experience points.");
      weakSignals.push("Missing scale and optimization metrics");
    } else {
      fixes.push("Refine bullet points to use the Action-Context-Result framework for technical impact.");
    }

    if (!hasModernTools) {
      fixes.push("Specify infrastructure, containerization, or deployment tools you used (e.g. Docker, CI/CD, AWS).");
      weakSignals.push("Lack of deployment and DevOps signals");
    } else {
      fixes.push("Categorize technical skills (e.g. Frontend, Backend, Database) to help recruiters scan in under 5 seconds.");
    }

    if (!hasLinks) {
      fixes.push("Add direct links to your GitHub or live project demos so engineering managers can verify code quality.");
      weakSignals.push("No verification links for projects");
    }
  } else {
    // Non-tech / Mixed
    if (!hasMetrics) {
      fixes.push("Quantify your business achievements (e.g. pipeline closed, growth rate, team size managed).");
      weakSignals.push("No revenue or conversion impact signals");
    }
    fixes.push("Add specific industry tools and methodologies (e.g. SQL, Tableau, Agile) instead of generic soft skills.");
    fixes.push("Reformat layout to lead with a summary of business outcomes rather than tasks.");
    weakSignals.push("Task-oriented description instead of outcome-oriented");
    weakSignals.push("Missing key data analysis tools");
  }

  // Fill in default placeholders if we don't have enough fixes/signals
  if (fixes.length < 3) {
    fixes.push("Ensure your summary highlights your unique value proposition in under 3 sentences.");
  }
  if (fixes.length < 3) {
    fixes.push("Fix date formats to be consistent (e.g., YYYY-MM to Present).");
  }
  if (weakSignals.length < 3) {
    weakSignals.push("Weak keyword density for target Indian market roles");
  }
  if (weakSignals.length < 3) {
    weakSignals.push("Education section leads before work experience");
  }

  // Top skills (max 4)
  const strongSkills = skills.slice(0, 4);
  if (strongSkills.length === 0) {
    strongSkills.push("Software Engineering", "Problem Solving");
  }

  return {
    score,
    fixes: fixes.slice(0, 3),
    strongSkills,
    weakSignals: weakSignals.slice(0, 3)
  };
}
