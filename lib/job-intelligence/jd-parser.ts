/**
 * ─── Module 1: JD Parser ──────────────────────────────────────────────────────
 *
 * Responsibilities:
 *  1. Call Google GenAI to extract structured data from raw JD text.
 *  2. Normalize skill/tool names (e.g. "React.js" → "React").
 *  3. Return a fully typed ParsedJob object.
 *
 * AI is ONLY used here. All downstream modules are deterministic.
 */

import { GoogleGenAI } from "@google/genai";
import { ParsedJob } from "./types";

// ─── Normalisation Map ────────────────────────────────────────────────────────
// Keeps the normalizer dynamic — add entries here to teach the system new aliases.

const SKILL_ALIASES: Record<string, string> = {
  "react.js": "React",
  "reactjs": "React",
  "react js": "React",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "node js": "Node.js",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "postgresql": "PostgreSQL",
  "postgres": "PostgreSQL",
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "graphql": "GraphQL",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "GCP",
  "google cloud": "GCP",
  "azure": "Azure",
  "microsoft azure": "Azure",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  "ci/cd": "CI/CD",
  "rest api": "REST APIs",
  "restful api": "REST APIs",
  "rest apis": "REST APIs",
  "redux": "Redux",
  "zustand": "Zustand",
  "figma": "Figma",
  "git": "Git",
  "github": "GitHub",
  "linux": "Linux",
  "python": "Python",
  "java": "Java",
  "c++": "C++",
  "golang": "Go",
  "go lang": "Go",
};

// Known tool/platform keywords (for separating "skills" from "tools" in the market report)
const TOOL_KEYWORDS = new Set([
  "docker", "kubernetes", "aws", "gcp", "azure", "github", "figma",
  "jira", "confluence", "jenkins", "gitlab", "terraform", "linux",
  "postman", "vercel", "netlify", "heroku", "firebase", "supabase",
  "redis", "rabbitmq", "kafka", "elasticsearch",
]);

/**
 * Normalises a single skill string using the alias map.
 * Falls back to Title Case if no alias found.
 */
export function normalizeSkill(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (SKILL_ALIASES[key]) return SKILL_ALIASES[key];
  // Title-case the words
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Classifies whether a normalized skill is a tool/platform. */
export function isTool(skill: string): boolean {
  return TOOL_KEYWORDS.has(skill.toLowerCase());
}

/**
 * Deduplicates and normalises an array of raw skill strings.
 */
function normalizeSkillList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map((s) => normalizeSkill(String(s)))
    .filter((s) => {
      if (!s || seen.has(s.toLowerCase())) return false;
      seen.add(s.toLowerCase());
      return true;
    });
}

/**
 * Stable SHA-256 hash of a string — used to deduplicate identical JDs.
 * Works in both Node.js (crypto) and browser-like environments.
 */
async function sha256(text: string): Promise<string> {
  // Node.js environment (API route)
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export async function parseJobDescription(rawText: string): Promise<ParsedJob> {
  if (!rawText?.trim()) {
    throw new Error("parseJobDescription: rawText is required");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are a senior technical recruiter and job description analyst.

Extract structured information from the following job description.

Return STRICTLY valid JSON matching this schema — no markdown, no commentary:
{
  "required_skills": ["string"],
  "optional_skills": ["string"],
  "tools": ["string"],
  "keywords": ["string"],
  "responsibilities": ["string"],
  "seniority": "Junior" | "Mid" | "Senior" | "Lead" | "Unknown",
  "domain": "string (e.g. Frontend, Backend, Full Stack, Data Science, DevOps, Mobile, AI/ML)"
}

Rules:
- required_skills: hard technical requirements (languages, frameworks)
- optional_skills: "nice to have", "bonus", "preferred"
- tools: platforms, cloud services, dev tools (AWS, Docker, GitHub, Figma, etc.)
- keywords: ATS-critical terms from the JD (include role names, methodologies, soft skills)
- seniority: infer from years of experience and language used
- domain: single best category for this role

Job Description:
${rawText.slice(0, 6000)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const raw = response.text ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    const value = JSON.parse(raw);
    parsed = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    throw new Error("JD Parser: AI returned invalid JSON");
  }

  // Normalise every skill field
  const required_skills = normalizeSkillList(parsed.required_skills ?? []);
  const optional_skills = normalizeSkillList(parsed.optional_skills ?? []);
  const tools = normalizeSkillList(parsed.tools ?? []);
  const keywords = normalizeSkillList(parsed.keywords ?? []);

  const id = await sha256(rawText);

  const validSeniorities = ["Junior", "Mid", "Senior", "Lead", "Unknown"];
  const seniorityValue = typeof parsed.seniority === "string" ? parsed.seniority : "Unknown";
  const seniority = validSeniorities.includes(seniorityValue)
    ? (seniorityValue as ParsedJob["seniority"])
    : "Unknown";

  return {
    id,
    parsedAt: new Date().toISOString(),
    rawText,
    required_skills,
    optional_skills,
    tools,
    keywords,
    responsibilities: Array.isArray(parsed.responsibilities)
      ? parsed.responsibilities.map(String)
      : [],
    seniority,
    domain: typeof parsed.domain === "string" ? parsed.domain : "Unknown",
  };
}
