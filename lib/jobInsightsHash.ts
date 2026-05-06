import crypto from "crypto";
import { ResumeData } from "@/lib/storage";

/**
 * Compute a deterministic SHA‑256 hash of a resume.
 * Used to invalidate cached job insights when the resume content changes.
 */
export function computeResumeHash(resume: ResumeData): string {
  const json = JSON.stringify(resume);
  return crypto.createHash("sha256").update(json).digest("hex");
}
