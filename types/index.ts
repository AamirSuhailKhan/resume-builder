/**
 * Barrel export — ALL type imports should come from "@/types"
 *
 * ResumeData is defined in lib/storage.ts (single source of truth for the schema).
 * We re-export it here so that any file that imports from "@/types" gets the
 * same type as files that import from "@/lib/storage" — ending the dual-schema
 * problem that caused "skills.map is not a function" and ATS crashes.
 */
export type { ResumeData, ResumeVersion } from "@/lib/storage";
export { storage } from "@/lib/storage";
