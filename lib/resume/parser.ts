import { PDFParse } from "pdf-parse";
import { normalizeResume } from "@/lib/normalizeResume";
import { prisma } from "@/lib/db/prisma";
import { RESUME_SOURCES } from "@/lib/constants/resume-sources";

export interface ParsedResumeResult {
  success: boolean;
  rawText?: string;
  source: string;
  error?: string;
  requiresOCR?: boolean;
  textLength?: number;
  pageCount?: number;
  metadata?: {
    pageCount?: number;
    title?: string;
  };
}

export class ResumeParserService {
  /**
   * Parse PDF from a file buffer (uses parseWithOCRFallback underneath)
   */
  static async parsePdf(buffer: Buffer): Promise<ParsedResumeResult> {
    return this.parseWithOCRFallback(buffer);
  }

  /**
   * Safe entry point containing automated PDF extraction and OCR fallbacks
   */
  static async parseWithOCRFallback(buffer: Buffer): Promise<ParsedResumeResult> {
    let pageCount = 1;
    let rawText = "";

    // 1. Attempt standard PDF text parsing
    try {
      // Resolve the pdfjs worker using the actual filesystem path relative to
      // the process working directory. This avoids Turbopack's module bundling
      // which mangles file paths when using createRequire() or import.meta.url.
      // Using process.cwd() gives us the project root reliably at runtime.
      try {
        const path = await import("path");
        const { pathToFileURL } = await import("url");
        const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
        const workerSrc = pathToFileURL(workerPath).href;
        PDFParse.setWorker(workerSrc);
      } catch (e) {
        console.warn("[ResumeParserService] Failed to set PDF worker path", e);
      }
      
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const data = await parser.getText();
      pageCount = data.total || 1;
      rawText = data.text?.trim() || "";
      console.log("PDF parsed");
      console.log("Text length:", rawText.length);

      if (rawText.length >= 100) {
        await parser.destroy().catch(() => undefined);
        console.log("Final text length:", rawText.length);
        const result = {
          success: true,
          rawText,
          source: RESUME_SOURCES.PDF,
          metadata: {
            pageCount,
          },
        };
        console.log("Return value:", JSON.stringify({ success: true, textLength: rawText.length }));
        return result;
      }
      
      // If we got here, text yield is low (< 100 chars). We must execute OCR!
      console.log("OCR started");
      
      const apiKey = process.env.GEMINI_API_KEY;
      let ocrText = "";
      
      // 1. Try Gemini Cloud OCR first
      if (apiKey && apiKey !== "xxx" && apiKey !== "mock" && !apiKey.startsWith("mock")) {
        try {
          console.log("[OCR] Attempting native Gemini multi-modal OCR...");
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
              {
                inlineData: {
                  data: buffer.toString("base64"),
                  mimeType: "application/pdf"
                }
              },
              "Extract all readable text from this PDF document. Do not summarize; return the exact transcribed text as is."
            ]
          });
          ocrText = response.text?.trim() || "";
        } catch (e) {
          console.warn("[OCR] Gemini Cloud OCR failed, falling back to local Tesseract OCR:", e);
        }
      }

      // 2. Try Local Tesseract OCR fallback with high-fidelity screenshot rendering
      if (ocrText.length < 100) {
        console.log("[OCR] Executing local Tesseract OCR fallback with PDF screenshot pages...");
        const screenshotResult = await parser.getScreenshot({ imageBuffer: true });
        const pagesToProcess = screenshotResult.pages.slice(0, 5);
        const results: string[] = [];
        const { extractTextFromImage } = await import("./ocr");

        for (let i = 0; i < pagesToProcess.length; i++) {
          const page = pagesToProcess[i];
          if (page && page.data) {
            console.log(`[OCR] Processing page ${i + 1}/${pagesToProcess.length}...`);
            try {
              const pageText = await extractTextFromImage(Buffer.from(page.data));
              if (pageText.trim()) {
                results.push(`--- Page ${i + 1} ---\n${pageText}`);
              }
            } catch (err) {
              console.error(`[OCR] Error rendering page ${i + 1}:`, err);
            }
          }
        }
        ocrText = results.join("\n\n");
      }

      console.log("OCR completed");
      console.log("OCR text length:", ocrText.length);
      console.log("Final text length:", ocrText.length);
      await parser.destroy().catch(() => undefined);

      if (ocrText.length >= 100) {
        const result = {
          success: true,
          rawText: ocrText,
          source: RESUME_SOURCES.PDF,
          metadata: {
            pageCount,
          },
        };
        console.log("Return value:", JSON.stringify({ success: true, textLength: ocrText.length }));
        return result;
      }
    } catch (parseError) {
      console.error("[ResumeParserService] Ingestion failed:", parseError);
    }

    // Return a clean, user-friendly error block if everything fails
    const failResult = {
      success: false,
      source: RESUME_SOURCES.PDF,
      error: "We couldn't read this file. Please upload another PDF, DOCX, or paste resume content.",
      requiresOCR: true,
      textLength: 0,
      pageCount,
    };
    console.log("Return value:", JSON.stringify({ success: false, error: failResult.error }));
    return failResult;
  }

  /**
   * Parse DOCX from a file buffer
   */
  static async parseDocx(buffer: Buffer): Promise<ParsedResumeResult> {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value?.trim() || "";
      if (rawText.length < 80) {
        return {
          success: false,
          source: RESUME_SOURCES.DOCX,
          error: "We could not extract enough readable text from the uploaded DOCX (minimum 80 characters required).",
        };
      }
      return {
        success: true,
        rawText,
        source: RESUME_SOURCES.DOCX,
      };
    } catch (error) {
      console.error("[ResumeParserService DOCX Parse Error]", error);
      return {
        success: false,
        source: RESUME_SOURCES.DOCX,
        error: "Unable to extract text from DOCX",
      };
    }
  }

  /**
   * Parse CareerOS resume matching the given resume ID and userId
   */
  static async parseCareerOSResume(resumeId: string, userId: string): Promise<ParsedResumeResult> {
    try {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId },
        select: { data: true },
      });

      if (!resume) {
        return {
          success: false,
          source: RESUME_SOURCES.CAREER_OS,
          error: "No resume found in Resume Builder matching the provided ID.",
        };
      }

      const rawText = this.resumeDataToText(resume.data);
      if (rawText.length < 80) {
        return {
          success: false,
          source: RESUME_SOURCES.CAREER_OS,
          error: "Select resume contains insufficient builder text data (minimum 80 characters required).",
        };
      }

      return {
        success: true,
        rawText,
        source: RESUME_SOURCES.CAREER_OS,
      };
    } catch (error) {
      console.error("[ResumeParserService CareerOS Resume Error]", error);
      return {
        success: false,
        source: RESUME_SOURCES.CAREER_OS,
        error: error instanceof Error ? error.message : "Unable to load CareerOS resume",
      };
    }
  }

  /**
   * Parse raw pasted text
   */
  static parseRawText(text: string): ParsedResumeResult {
    const rawText = text.trim();
    if (rawText.length < 80) {
      return {
        success: false,
        source: RESUME_SOURCES.PASTE,
        error: "Paste at least 80 characters of resume content.",
      };
    }
    return {
      success: true,
      rawText,
      source: RESUME_SOURCES.PASTE,
    };
  }

  /**
   * Internal helper to convert JSON resume structure to standard text
   */
  public static resumeDataToText(data: unknown): string {
    const resume = normalizeResume(data);
    const raw = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
    const rawProjects = Array.isArray(raw.projects) ? raw.projects : [];
    const experience = resume.experience
      .map((item) => `${item.role} ${item.company}\n${item.points}`)
      .join("\n\n");
    const education = resume.education
      .map((item) => `${item.degree} ${item.school} ${item.year}`)
      .join("\n");
    const projects = rawProjects
      .map((project) => {
        if (!project || typeof project !== "object" || Array.isArray(project)) return "";
        const value = project as Record<string, unknown>;
        return [value.name, value.title, value.description, value.points].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
    return [
      resume.personal.name,
      resume.personal.summary,
      resume.skills.join(", "),
      experience,
      education,
      projects,
    ].filter(Boolean).join("\n\n");
  }
}
