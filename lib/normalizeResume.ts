import { ResumeData } from "./storage";

// ─── Field-level coercion helpers ─────────────────────────────────────────────

function toStr(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (val == null) return fallback;
  return String(val);
}

function toStrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

function toPointsStr(val: unknown): string {
  // points in our schema is a single string (bullet text)
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(String).join("\n");
  return "";
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

/**
 * Accepts ANY shape of data (from localStorage, AI, or user input) and returns
 * a fully-conformant ResumeData object. Calling this at every data boundary
 * prevents all `.map()` crashes and undefined errors.
 */
export function normalizeResume(raw: any): ResumeData {
  if (!raw || typeof raw !== "object") raw = {};

  // Normalize personal — handle both flat and nested shapes
  const p = raw.personal ?? raw;
  const personal = {
    name: toStr(p?.name ?? p?.fullName ?? raw?.name),
    email: toStr(p?.email ?? raw?.email),
    phone: toStr(p?.phone ?? raw?.phone),
    location: toStr(p?.location ?? raw?.location),
    summary: toStr(p?.summary ?? raw?.summary),
  };

  // Normalize experience
  const rawExp = Array.isArray(raw.experience) ? raw.experience : [];
  const experience = rawExp.map((e: any, i: number) => ({
    id: toStr(e?.id ?? String(i + 1)),
    company: toStr(e?.company),
    role: toStr(e?.role ?? e?.title ?? e?.position),
    startDate: toStr(e?.startDate ?? e?.start),
    endDate: toStr(e?.endDate ?? e?.end ?? "Present"),
    points: toPointsStr(e?.points ?? e?.description ?? e?.bullets),
  }));

  // Normalize education
  const rawEdu = Array.isArray(raw.education) ? raw.education : [];
  const education = rawEdu.map((e: any, i: number) => ({
    id: toStr(e?.id ?? String(i + 1)),
    school: toStr(e?.school ?? e?.institution),
    degree: toStr(e?.degree ?? e?.qualification),
    year: toStr(e?.year ?? e?.endYear ?? e?.graduationYear),
  }));

  // Normalize skills
  const skills = toStrArray(raw.skills);

  return {
    id: toStr(raw.id ?? String(Date.now())),
    title: toStr(raw.title ?? personal.name ?? "Untitled Resume"),
    template: (["modern", "minimal", "professional"].includes(raw.template)
      ? raw.template
      : "modern") as "modern" | "minimal" | "professional",
    personal,
    experience,
    education,
    skills,
    createdAt: toStr(raw.createdAt ?? new Date().toISOString()),
    updatedAt: toStr(raw.updatedAt ?? new Date().toISOString()),
  };
}
