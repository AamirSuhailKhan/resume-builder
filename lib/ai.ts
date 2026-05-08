import { ResumeData } from "./storage";
import { normalizeResume } from "./normalizeResume";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface OptimizeResult {
  scores: {
    before: number;
    after: number;
  };
  tailored_package: {
    resume: string;
    cover_letter: string;
    email: string;
  };
  optimizations: {
    original: string;
    improved: string;
    reason: string;
    impact: string;
  }[];
  metrics_and_proof: {
    suggested_metrics: string[];
    proof_suggestions: {
      achievement: string;
      suggested_proof: string;
    }[];
  };
}

export interface JobAnalysisResult {
  required_skills: string[];
  optional_skills: string[];
  keywords: string[];
  responsibilities: string[];
  seniority: string;
  hidden_expectations: string[];
  industry_signals: string[];
}

export interface ApplicationPackageResult {
  cover_letter: string;
  email: string;
}

// ─── optimizeResume ───────────────────────────────────────────────────────────

/**
 * Sends resume + JD to /api/optimize and returns the validated AI result.
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

  return {
    scores: {
      before: typeof data.scores?.before === "number" ? data.scores.before : 45,
      after: typeof data.scores?.after === "number" ? data.scores.after : 85,
    },
    tailored_package: {
      resume: typeof data.tailored_package?.resume === "string" ? data.tailored_package.resume : "",
      cover_letter: typeof data.tailored_package?.cover_letter === "string" ? data.tailored_package.cover_letter : "",
      email: typeof data.tailored_package?.email === "string" ? data.tailored_package.email : "",
    },
    optimizations: Array.isArray(data.optimizations) ? data.optimizations : [],
    metrics_and_proof: {
      suggested_metrics: Array.isArray(data.metrics_and_proof?.suggested_metrics) ? data.metrics_and_proof.suggested_metrics : [],
      proof_suggestions: Array.isArray(data.metrics_and_proof?.proof_suggestions) ? data.metrics_and_proof.proof_suggestions : [],
    }
  };
}

// ─── mergeOptimizedResume ─────────────────────────────────────────────────────

/**
 * Safely merges AI-improved fields into the original resume.
 * Applies exact text replacements for optimized bullets.
 */
export function mergeOptimizedResume(
  original: ResumeData,
  result: OptimizeResult
): ResumeData {
  const merged: ResumeData = JSON.parse(JSON.stringify(original)); // deep clone

  if (result.optimizations && result.optimizations.length > 0 && Array.isArray(merged.experience)) {
    for (const fix of result.optimizations) {
      if (!fix.original?.trim() || !fix.improved?.trim()) continue;

      for (let i = 0; i < merged.experience.length; i++) {
        const experience = merged.experience[i];
        if (!experience) continue;
        const points = experience.points;
        if (typeof points !== "string") continue;

        if (points.includes(fix.original)) {
          experience.points = points.replace(fix.original, fix.improved);
          break;
        }

        const originalWords = fix.original.toLowerCase().split(/\s+/).filter(Boolean);
        const bulletLower = points.toLowerCase();
        const matchCount = originalWords.filter((word) => bulletLower.includes(word)).length;
        if (originalWords.length > 0 && matchCount / originalWords.length >= 0.8) {
          experience.points = fix.improved;
          break;
        }
      }
    }
  }

  return normalizeResume(merged);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function safeSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

// ─── Other Methods ──────────────────────────────────────────────────────────

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

export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysisResult> {
  const response = await fetch("/api/analyze-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to analyze job description");
  }

  return response.json();
}

export async function generateApplicationPackage(
  resume: ResumeData, 
  jobDescription: string,
  tone: string = "Professional",
  focus: string = "ATS Optimized"
): Promise<ApplicationPackageResult> {
  const response = await fetch("/api/generate-application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeData: resume, jobDescription, tone, focus }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate application package");
  }

  return response.json();
}

export async function improveResume(resume: ResumeData): Promise<ResumeData> {
  const response = await fetch("/api/improve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeData: resume }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to improve resume");
  }

  const { improvedData } = await response.json();
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

export async function optimizeResumeForJob(resume: ResumeData, jobDescription: string, resumeId?: string) {
  const response = await fetch("/api/ai/optimize-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeData: resume, jobDescription, resumeId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to optimize resume for job");
  }

  const data = await response.json();
  // Return the specific structured output as required:
  // { optimizedResume, atsScore, missingKeywords, improvements, rewrittenBullets, matchAnalysis }
  return data;
}
