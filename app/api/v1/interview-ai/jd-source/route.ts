import { Buffer } from "node:buffer";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";
import { ResumeParserService } from "@/lib/resume/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pasteSchema = z.object({
  sourceType: z.literal("paste"),
  jobDescription: z.string().trim().refine(
    (val) => val.split(/\s+/).filter(Boolean).length >= 5,
    "Paste at least 5 words of job description."
  ),
});

const urlSchema = z.object({
  sourceType: z.literal("url"),
  jobUrl: z.string().url(),
});

const applicationSchema = z.object({
  sourceType: z.literal("application"),
  applicationId: z.string().uuid(),
});

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJobUrl(jobUrl: string) {
  const url = new URL(jobUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP(S) job URLs are supported.");
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": "CareerOS InterviewAI/4.0 (+https://career-os.ai)",
      accept: "text/html,text/plain,application/pdf;q=0.8,*/*;q=0.2",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("Could not fetch this job URL.");
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const parseResult = await ResumeParserService.parsePdf(buffer);
    if (!parseResult.success || !parseResult.rawText) {
      throw new Error(parseResult.error || "Unable to extract text from PDF job description.");
    }
    return parseResult.rawText;
  }

  return stripHtml(await response.text());
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return apiError("Upload a JD PDF or DOCX file.", 400);

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx");
      if (!isPdf && !isDocx) return apiError("Only PDF and DOCX JD uploads are supported.", 400);

      const buffer = Buffer.from(await file.arrayBuffer());
      if (isPdf) {
        console.log("PDF uploaded");
      }
      const parseResult = isPdf 
        ? await ResumeParserService.parsePdf(buffer)
        : await ResumeParserService.parseDocx(buffer);

      if (!parseResult.success || !parseResult.rawText) {
        return Response.json(
          {
            success: false,
            error: "We couldn't read this file. Please upload another PDF, DOCX, or paste resume content."
          },
          { status: 400 }
        );
      }
      return apiOk(InterviewAIV4Service.parseJobDescription(parseResult.rawText, isPdf ? "upload_pdf" : "upload_docx"));
    }

    const body = await req.json().catch(() => null);
    console.log("REQUEST BODY", body);

    if (!body || typeof body !== "object") {
      return apiError("Request body must be a non-empty JSON object.", 400);
    }

    const sourceType = (body as Record<string, unknown>).sourceType;

    if (sourceType === "paste") {
      const paste = pasteSchema.safeParse(body);
      if (!paste.success) {
        const msg = paste.error.issues[0]?.message ?? "Invalid paste payload.";
        return apiError(msg, 400);
      }
      return apiOk(InterviewAIV4Service.parseJobDescription(paste.data.jobDescription, "paste"));
    }

    if (sourceType === "url") {
      const url = urlSchema.safeParse(body);
      if (!url.success) {
        const msg = url.error.issues[0]?.message ?? "Invalid URL payload.";
        return apiError(msg, 400);
      }
      const rawText = await fetchJobUrl(url.data.jobUrl);
      if (rawText.split(/\s+/).filter(Boolean).length < 5) return apiError("Could not extract enough job text from this URL.", 422);
      return apiOk(InterviewAIV4Service.parseJobDescription(rawText, "job_url"));
    }

    if (sourceType === "application") {
      const application = applicationSchema.safeParse(body);
      if (!application.success) {
        const msg = application.error.issues[0]?.message ?? "Invalid application payload.";
        return apiError(msg, 400);
      }
      const saved = await prisma.application.findFirst({
        where: { id: application.data.applicationId, userId: user.id },
        include: { jobOpportunity: true },
      });
      if (!saved) return apiError("Saved application not found.", 404);
      const rawText = [
        saved.role,
        saved.company,
        saved.notes,
        saved.jobOpportunity?.description,
      ].filter(Boolean).join("\n\n");
      if (rawText.split(/\s+/).filter(Boolean).length < 5) return apiError("Saved application does not contain enough JD text.", 422);
      return apiOk(InterviewAIV4Service.parseJobDescription(rawText, "saved_application"));
    }

    return apiError(
      sourceType
        ? `Unknown sourceType "${String(sourceType)}". Valid values: paste, url, application, or upload a file.`
        : "Missing sourceType field. Send { sourceType: \"paste\" | \"url\" | \"application\" } or upload a file.",
      400
    );
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
