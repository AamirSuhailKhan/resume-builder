import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "./normalizeResume";

export function extractKeywords(text: string): string[] {
  if (!text) return [];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/);

  const stopWords = new Set([
    "and", "the", "with", "for", "a", "an", "to", "of", "in", "is", "at", "by", "from",
    "or", "as", "be", "this", "that", "are", "it", "will", "your", "we", "you", "our",
    "have", "not", "but", "what", "all", "were", "when", "can", "if", "their"
  ]);

  return Array.from(
    new Set(words.filter(w => w.length >= 3 && !stopWords.has(w)))
  );
}

export function matchKeywords(resume: ResumeData, jobDescription: string) {
  const safe = normalizeResume(resume);

  const resumeText = [
    safe.personal?.summary || "",
    ...safe.skills,
    ...safe.experience.map(e => `${e.role} ${e.company} ${e.points}`)
  ].join(" ");

  const resumeKeywords = new Set(extractKeywords(resumeText));
  const jobKeywords = extractKeywords(jobDescription);

  if (jobKeywords.length === 0) {
    return { matched: [], missing: [], percentage: 0 };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  jobKeywords.forEach(kw => {
    resumeKeywords.has(kw) ? matched.push(kw) : missing.push(kw);
  });

  return {
    matched,
    missing,
    percentage: Math.round((matched.length / jobKeywords.length) * 100)
  };
}

export function calculateLocalATSScore(resume: ResumeData, jobDescription?: string) {
  const r = normalizeResume(resume);

  let score = 100;
  const suggestions: string[] = [];

  if (!r.personal?.summary?.trim()) {
    score -= 10;
    suggestions.push("Add a professional summary.");
  }

  if (r.experience.length === 0) {
    score -= 20;
    suggestions.push("Add work experience.");
  }

  if (r.skills.length < 3) {
    score -= 10;
    suggestions.push("Add more skills.");
  }

  if (r.education.length === 0) {
    score -= 10;
    suggestions.push("Add education.");
  }

  const expText = r.experience
    .map(e => `${e.role} ${e.company} ${e.points}`)
    .join(" ");

  if (/\d+%?/.test(expText)) {
    score += 10;
  } else if (r.experience.length > 0) {
    suggestions.push("Add measurable results (e.g. +30%).");
  }

  if (r.experience.length >= 3) {
    score += 10;
  }

  let keywordMatchData = null;

  if (jobDescription?.trim()) {
    keywordMatchData = matchKeywords(r, jobDescription);

    score += Math.round((keywordMatchData.percentage / 100) * 20);

    if (keywordMatchData.percentage < 50) {
      suggestions.push(`Low keyword match (${keywordMatchData.percentage}%).`);
    } else if (keywordMatchData.percentage >= 80) {
      suggestions.push("Strong keyword alignment.");
    }
  } else {
    suggestions.push("Add job description for better scoring.");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
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

    if (!response.ok) throw new Error("API error");

    const data = await response.json();
    console.log("ATS RESPONSE:", data);

    // ✅ SUPPORT BOTH FORMATS (important)
    const result = data.atsResult || data;

    if (
      typeof result?.score === "number" &&
      Array.isArray(result?.suggestions)
    ) {
      return {
        score: Math.max(0, Math.min(100, result.score)),
        suggestions: result.suggestions,
        keywordMatchData: result.keywordMatchData || null
      };
    }

    throw new Error("Invalid AI response");
  } catch (err) {
    console.warn("Fallback ATS:", err);
    return calculateLocalATSScore(resume, jobDescription);
  }
}