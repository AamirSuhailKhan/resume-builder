import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { PDFParse } from "pdf-parse";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { validateUpload } from "@/lib/security/upload";
import { createClient } from "@/lib/supabaseServer";
import { analyzeOnboardingResume } from "@/lib/detectProfile";
import { safeParseAIJson } from "@/lib/ai/recovery";

export const runtime = "nodejs";

const RESUME_PARSE_SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the resume text and return ONLY valid JSON matching this TypeScript interface exactly - no markdown, no preamble:
{
  personal: { firstName, lastName, email, phone, location, linkedin, website, summary },
  experience: [{ id, company, role, startDate, endDate, current, points }],
  education: [{ id, institution, degree, field, startDate, endDate, gpa }],
  skills: string[],
  projects: [{ id, name, description, url, points }],
  certifications: [{ id, name, issuer, date }],
  customSections: []
}
Use UUID v4 strings for all id fields. Format dates as "YYYY-MM" or "Present".`;

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicMessageResponse = {
  content?: AnthropicTextBlock[];
};

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}



function extractJsonObject(text: string): unknown {
  return safeParseAIJson(text, {});
}

async function parseWithAnthropic(resumeText: string): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: RESUME_PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this resume:\n\n${resumeText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as AnthropicMessageResponse;
  const text = data.content?.find((block) => block.type === "text")?.text;

  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }

  return extractJsonObject(text);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const pdfData = await parser.getText();
    return pdfData.text;
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const validation = await validateUpload(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error ?? "Invalid upload." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resumeId = randomUUID();
    const storagePath = `${userId}/${resumeId}.pdf`;
    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    let resumeText: string;
    try {
      resumeText = await extractPdfText(buffer);
    } catch {
      return NextResponse.json(
        { error: "Unable to extract text from this PDF. Please upload a text-based resume PDF." },
        { status: 422 }
      );
    }

    let rawParsedResume: unknown;
    try {
      rawParsedResume = await parseWithAnthropic(resumeText);
    } catch (error) {
      const message = error instanceof SyntaxError
        ? "AI returned invalid JSON. Please try again."
        : error instanceof Error
          ? error.message
          : "Unable to parse resume with AI.";

      return NextResponse.json({ error: message }, { status: 422 });
    }

    const parsedData = normalizeResume(rawParsedResume);
    const rawPersonal = rawParsedResume && typeof rawParsedResume === "object" && "personal" in rawParsedResume
      ? (rawParsedResume.personal as Record<string, unknown>)
      : {};
    const firstName = getString(rawPersonal.firstName) || parsedData.personal.name.split(" ")[0] || "Imported";

    const { invalidateCoachPrompt } = await import("@/lib/coach/cache");
    const resume = await prisma.resume.create({
      data: {
        id: resumeId,
        userId,
        title: `${firstName}'s Resume`,
        data: parsedData as unknown as Prisma.InputJsonValue,
        status: "completed",
      },
    });

    await invalidateCoachPrompt(userId).catch(() => undefined);

    const profileAnalysis = analyzeOnboardingResume(parsedData);

    return NextResponse.json({
      resumeId: resume.id,
      previewData: parsedData,
      analysis: profileAnalysis,
    });
  } catch (error) {
    console.error("[ResumeUpload] Upload pipeline failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
