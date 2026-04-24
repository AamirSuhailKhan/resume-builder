import { ResumeData } from "./storage";

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

  return improved;
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

  return optimized;
}
