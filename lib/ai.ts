import { ResumeData } from "./storage";
import { normalizeResume } from "./normalizeResume";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface OptimizeResult {
  score: number;
  keywordMatchData: {
    matched: string[];
    missing: string[];
    percentage: number;
  };
  improved: {
    summary: string;
    experience: { index: number; points: string }[];
    skills: string[];
  };
}

// ─── optimizeResume ───────────────────────────────────────────────────────────

/**
 * Sends resume + JD to /api/optimize and returns the validated AI result.
 * Falls back to a minimal safe object on any error so the UI never crashes.
 */
export async function optimizeResume(
  resume: ResumeData,
  jobDescription: string
): Promise<OptimizeResult> {
  const response = await fetch("/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeData: resume, jobDescription }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Optimization API failed");
  }

  const data = await response.json();

  // Validate shape — every field gets a safe default if AI returned garbage
  return {
    score: typeof data.score === "number" ? Math.max(0, Math.min(92, data.score)) : 60,
    keywordMatchData: {
      matched: Array.isArray(data.keywordMatchData?.matched) ? data.keywordMatchData.matched : [],
      missing: Array.isArray(data.keywordMatchData?.missing) ? data.keywordMatchData.missing : [],
      percentage: typeof data.keywordMatchData?.percentage === "number" ? data.keywordMatchData.percentage : 0,
    },
    improved: {
      summary: typeof data.improved?.summary === "string" ? data.improved.summary : "",
      experience: Array.isArray(data.improved?.experience) ? data.improved.experience : [],
      skills: Array.isArray(data.improved?.skills) ? data.improved.skills.map(String) : [],
    },
  };
}

// ─── mergeOptimizedResume ─────────────────────────────────────────────────────

/**
 * Safely merges AI-improved fields into the original resume.
 *
 * Rules:
 * - Never overwrites with empty string
 * - Maps experience by index, keeps original if AI skipped it
 * - Always returns a fully valid ResumeData (via normalizeResume)
 */
export function mergeOptimizedResume(
  original: ResumeData,
  improved: OptimizeResult["improved"]
): ResumeData {
  const merged: ResumeData = JSON.parse(JSON.stringify(original)); // deep clone

  // Merge summary
  if (improved.summary?.trim()) {
    merged.personal = { ...merged.personal, summary: improved.summary };
  }

  // Merge experience points by index
  if (improved.experience.length > 0 && Array.isArray(merged.experience)) {
    improved.experience.forEach(({ index, points }) => {
      if (
        typeof index === "number" &&
        index >= 0 &&
        index < merged.experience.length &&
        points?.trim()
      ) {
        merged.experience[index] = { ...merged.experience[index], points };
      }
    });
  }

  // Merge skills — union of original + new, deduplicated
  if (improved.skills.length > 0) {
    const existing = new Set((merged.skills || []).map(s => s.toLowerCase()));
    const newSkills = improved.skills.filter(s => !existing.has(s.toLowerCase()));
    merged.skills = [...(merged.skills || []), ...newSkills];
  }

  return normalizeResume(merged);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Always returns a string[] regardless of what storage gave us */
export function safeSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

// ─── Generate Job Description ─────────────────────────────────────────────────

export async function generateJobDescription(jobTitle: string): Promise<string> {
  const response = await fetch("/api/generate-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobTitle }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate job description");
  }

  const data = await response.json();
  if (!data.jobDescription) throw new Error("Invalid response from job generator");
  return data.jobDescription;
}

export async function improveResume(resume: ResumeData): Promise<ResumeData> {
  const response = await fetch("/api/improve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resumeData: resume }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to improve resume");
  }

  const { improvedData } = await response.json();

  // Create a deep copy to avoid mutating original state directly
  const improved: ResumeData = JSON.parse(JSON.stringify(resume));

  if (improvedData.summary && improved.personal) {
    improved.personal.summary = improvedData.summary;
  }
  
  if (improvedData.experience && Array.isArray(improvedData.experience)) {
    improved.experience = improved.experience.map((exp, i) => {
      const improvedExp = improvedData.experience[i];
      if (improvedExp) {
        return {
          ...exp,
          role: improvedExp.role || exp.role,
          company: improvedExp.company || exp.company,
          points: improvedExp.description || improvedExp.points || exp.points
        };
      }
      return exp;
    });
  }

  if (improvedData.skills && Array.isArray(improvedData.skills)) {
    improved.skills = improvedData.skills;
  }

  return normalizeResume(improved);
}

export async function optimizeResumeForJob(resume: ResumeData, jobDescription: string): Promise<ResumeData> {
  const response = await fetch("/api/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resumeData: resume, jobDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to optimize resume");
  }

  const { optimizedData } = await response.json();

  // Merge the optimized fields securely into a copy of the original resume
  const optimized: ResumeData = JSON.parse(JSON.stringify(resume));

  if (optimizedData.summary && optimized.personal) {
    optimized.personal.summary = optimizedData.summary;
  }
  
  if (optimizedData.experience && Array.isArray(optimizedData.experience)) {
    optimized.experience = optimized.experience.map((exp, i) => {
      const optimizedExp = optimizedData.experience[i];
      if (optimizedExp) {
        return {
          ...exp,
          role: optimizedExp.role || exp.role,
          company: optimizedExp.company || exp.company,
          points: optimizedExp.description || optimizedExp.points || exp.points
        };
      }
      return exp;
    });
  }

  if (optimizedData.skills && Array.isArray(optimizedData.skills)) {
    optimized.skills = optimizedData.skills;
  }

  return normalizeResume(optimized);
}
