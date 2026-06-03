export const RESUME_SOURCES = {
  PASTE: "paste",
  CAREER_OS: "careeros",
  PDF: "upload-pdf",
  DOCX: "upload-docx",
} as const;

export type ResumeSource = typeof RESUME_SOURCES[keyof typeof RESUME_SOURCES];
