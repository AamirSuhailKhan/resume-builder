import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";
import { RESUME_SOURCES } from "@/lib/constants/resume-sources";
import { ResumeParserService } from "@/lib/resume/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pasteSchema = z.object({
  sourceType: z.literal(RESUME_SOURCES.PASTE),
  resumeText: z.string().trim().min(80, "Paste at least 80 characters of resume content."),
});

const importSchema = z.object({
  sourceType: z.literal(RESUME_SOURCES.CAREER_OS),
  resumeId: z.string().uuid("Invalid CareerOS resume ID format."),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            success: false,
            received: "no-file-field",
            validSources: Object.values(RESUME_SOURCES),
            error: "No file was selected for upload."
          },
          { status: 400 }
        );
      }

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx");
      
      if (!isPdf && !isDocx) {
        return NextResponse.json(
          {
            success: false,
            received: file.type || file.name.split(".").pop() || "unknown-extension",
            validSources: Object.values(RESUME_SOURCES),
            error: "Only PDF (.pdf) and DOCX (.docx) formats are accepted."
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (isPdf) {
        console.log("PDF uploaded");
      }
      const parseResult = isPdf 
        ? await ResumeParserService.parsePdf(buffer)
        : await ResumeParserService.parseDocx(buffer);

      if (!parseResult.success || !parseResult.rawText) {
        return NextResponse.json(
          {
            success: false,
            received: isPdf ? RESUME_SOURCES.PDF : RESUME_SOURCES.DOCX,
            validSources: Object.values(RESUME_SOURCES),
            error: "We couldn't read this file. Please upload another PDF, DOCX, or paste resume content."
          },
          { status: 400 }
        );
      }

      const parsedProfile = InterviewAIV4Service.parseResumeText(
        parseResult.rawText,
        isPdf ? RESUME_SOURCES.PDF : RESUME_SOURCES.DOCX
      );

      return apiOk(parsedProfile);
    }

    const body = await req.json().catch(() => null);
    console.log("REQUEST BODY", body);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          received: "empty-or-invalid-json",
          validSources: Object.values(RESUME_SOURCES),
          error: "Request body must be non-empty JSON object."
        },
        { status: 400 }
      );
    }

    const paste = pasteSchema.safeParse(body);
    if (paste.success) {
      const parseResult = ResumeParserService.parseRawText(paste.data.resumeText);
      if (!parseResult.success || !parseResult.rawText) {
        return NextResponse.json(
          {
            success: false,
            received: RESUME_SOURCES.PASTE,
            validSources: Object.values(RESUME_SOURCES),
            error: parseResult.error || "Invalid raw text content."
          },
          { status: 400 }
        );
      }
      const parsedProfile = InterviewAIV4Service.parseResumeText(
        parseResult.rawText,
        RESUME_SOURCES.PASTE
      );
      return apiOk(parsedProfile);
    }

    const imported = importSchema.safeParse(body);
    if (imported.success) {
      const parseResult = await ResumeParserService.parseCareerOSResume(imported.data.resumeId, user.id);
      if (!parseResult.success || !parseResult.rawText) {
        return NextResponse.json(
          {
            success: false,
            received: RESUME_SOURCES.CAREER_OS,
            validSources: Object.values(RESUME_SOURCES),
            error: parseResult.error || "Unable to parse CareerOS resume."
          },
          { status: 400 }
        );
      }
      const parsedProfile = InterviewAIV4Service.parseResumeText(
        parseResult.rawText,
        RESUME_SOURCES.CAREER_OS
      );
      return apiOk(parsedProfile);
    }

    // Diagnostics if the payload fails validation checks
    return NextResponse.json(
      {
        success: false,
        received: body.sourceType ?? "unknown",
        validSources: Object.values(RESUME_SOURCES),
        error: "Invalid resume source request parameters."
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
