/**
 * SCHEMA BRIDGE — DO NOT DELETE
 *
 * Components that import from "@/types/resume" (ATSAnalyzerModal, ResumeForm, etc.)
 * now get the same canonical ResumeData defined in lib/storage.ts.
 *
 * This eliminates the dual-schema collision that caused TypeScript errors and
 * runtime crashes when legacy components received Zustand store data.
 */
export type { ResumeData, ResumeVersion } from "@/lib/storage";
export { storage } from "@/lib/storage";

// ── Compatibility alias ──────────────────────────────────────────────────────
// Legacy code referenced `Experience` as a named export. Re-export it here.
import type { ResumeData } from "@/lib/storage";
export type Experience = ResumeData["experience"][number];

// ── initialResumeData ────────────────────────────────────────────────────────
// Some legacy files imported this. Provide a safe default that matches the
// nested schema so it never crashes if referenced.
export const initialResumeData: ResumeData = {
  id: "default",
  title: "My Resume",
  template: "modern",
  personal: {
    name: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
  },
  experience: [],
  education: [],
  skills: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
