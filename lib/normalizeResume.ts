import { ResumeData } from "./storage";

type LooseRecord = Record<string, unknown>;

function toStr(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (val == null) return fallback;
  return String(val);
}

function toStrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function toPointsStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(String).join("\n");
  return "";
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as LooseRecord) : {};
}

export function normalizeResume(raw: unknown): ResumeData {
  const r = asRecord(raw);
  const p = asRecord(r.personal ?? r);

  const personal = {
    name: toStr(p.name ?? p.fullName ?? r.name),
    email: toStr(p.email ?? r.email),
    phone: toStr(p.phone ?? r.phone),
    location: toStr(p.location ?? r.location),
    summary: toStr(p.summary ?? r.summary),
  };

  const rawExp = Array.isArray(r.experience) ? r.experience : [];
  const experience = rawExp.map((item, index) => {
    const e = asRecord(item);
    return {
      id: toStr(e.id ?? String(index + 1)),
      company: toStr(e.company),
      role: toStr(e.role ?? e.title ?? e.position),
      startDate: toStr(e.startDate ?? e.start),
      endDate: toStr(e.endDate ?? e.end ?? "Present"),
      points: toPointsStr(e.points ?? e.description ?? e.bullets),
    };
  });

  const rawEdu = Array.isArray(r.education) ? r.education : [];
  const education = rawEdu.map((item, index) => {
    const e = asRecord(item);
    return {
      id: toStr(e.id ?? String(index + 1)),
      school: toStr(e.school ?? e.institution),
      degree: toStr(e.degree ?? e.qualification),
      year: toStr(e.year ?? e.endYear ?? e.graduationYear),
    };
  });

  const status = typeof r.status === "string" && ["completed", "pending", "processing", "failed"].includes(r.status)
    ? r.status
    : "completed";

  const template = typeof r.template === "string" && ["modern", "minimal", "professional"].includes(r.template)
    ? r.template
    : "modern";

  return {
    id: toStr(r.id ?? String(Date.now())),
    title: toStr(r.title ?? personal.name ?? "Untitled Resume"),
    status: status as ResumeData["status"],
    template: template as ResumeData["template"],
    personal,
    experience,
    education,
    skills: toStrArray(r.skills),
    createdAt: toStr(r.createdAt ?? new Date().toISOString()),
    updatedAt: toStr(r.updatedAt ?? new Date().toISOString()),
  };
}
