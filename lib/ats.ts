import { ResumeData } from "./storage";

export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const lowercase = text.toLowerCase();
  const withoutPunctuation = lowercase.replace(/[^\w\s]/g, " ");
  const words = withoutPunctuation.split(/\s+/);
  
  const stopWords = new Set([
    "and", "the", "with", "for", "a", "an", "to", "of", "in", 
    "is", "at", "by", "from", "or", "as", "be", "this", "that", 
    "are", "it", "will", "your", "we", "you", "our", "have", 
    "not", "but", "what", "all", "were", "when", "can", "if", "their"
  ]);
  
  const keywords = words.filter(w => w.length >= 3 && !stopWords.has(w));
  return Array.from(new Set(keywords));
}

export function matchKeywords(resume: ResumeData, jobDescription: string) {
  const resumeText = [
    resume.personal?.summary || "",
    ...(resume.skills || []),
    ...(resume.experience || []).map(e => `${e.role} ${e.company} ${e.points}`)
  ].join(" ");

  const resumeKeywords = new Set(extractKeywords(resumeText));
  const jobKeywords = extractKeywords(jobDescription);

  if (jobKeywords.length === 0) {
    return { matched: [], missing: [], percentage: 0 };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jobKeywords) {
    if (resumeKeywords.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const percentage = Math.round((matched.length / jobKeywords.length) * 100);

  return { matched, missing, percentage };
}

export function calculateLocalATSScore(resume: ResumeData, jobDescription?: string) {
  let score = 100;
  const suggestions: string[] = [];

  // Deductions
  if (!resume.personal?.summary || resume.personal.summary.trim() === "") {
    score -= 10;
    suggestions.push("Add a professional summary to highlight your high-level value.");
  }

  if (!resume.experience || resume.experience.length === 0) {
    score -= 20;
    suggestions.push("Add your work experience. ATS systems heavily weigh professional history.");
  }

  if (!resume.skills || resume.skills.length < 3) {
    score -= 10;
    suggestions.push("Add more relevant skills (aim for at least 5-10 core skills).");
  }

  if (!resume.education || resume.education.length === 0) {
    score -= 10;
    suggestions.push("Include your education history, even if it's just a relevant certification.");
  }

  // Bonus: Measurable numbers
  const expText = resume.experience?.map(e => `${e.role} ${e.company} ${e.points}`).join(" ") || "";
  if (/\d+%?/.test(expText)) {
    score += 10;
  } else if (resume.experience && resume.experience.length > 0) {
    suggestions.push("Include measurable achievements in your experience (e.g., 'increased sales by 20%').");
  }

  // Bonus: 3+ experience entries
  if (resume.experience && resume.experience.length >= 3) {
    score += 10;
  }

  let keywordMatchData = null;

  // Keyword scoring based on Job Description
  if (jobDescription && jobDescription.trim().length > 0) {
    keywordMatchData = matchKeywords(resume, jobDescription);
    const keywordScore = Math.round((keywordMatchData.percentage / 100) * 20);
    score += keywordScore;

    if (keywordMatchData.percentage < 50) {
      suggestions.push(`Improve keyword matching. You matched only ${keywordMatchData.percentage}% of the job description keywords.`);
    } else if (keywordMatchData.percentage >= 80) {
      suggestions.push("Great job! Your resume is highly optimized for this job description.");
    }
  } else {
    suggestions.push("Paste a job description to get a tailored keyword optimization score.");
  }

  // Final Clamp
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    suggestions,
    keywordMatchData
  };
}

export async function calculateATSScore(resume: ResumeData, jobDescription?: string) {
  try {
    const response = await fetch("/api/ats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeData: resume, jobDescription })
    });

    console.log("ATS API STATUS:", response.status);

    if (!response.ok) {
      throw new Error("API route returned an error");
    }

    const data = await response.json();
    console.log("ATS RAW RESPONSE:", data);
    
    if (typeof data.score === "number") {
      data.score = Math.min(data.score, 92);
      return data;
    }
    
    throw new Error("Invalid format from AI");
  } catch (error) {
    console.warn("AI ATS Engine failed, falling back to local scoring:", error);
    return calculateLocalATSScore(resume, jobDescription);
  }
}

