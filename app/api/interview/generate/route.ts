import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { CompanyInterviewService } from "@/lib/services/company-interview.service";
import { callClaudeJson, getString } from "../_lib/claude";

export const runtime = "nodejs";

type InterviewQuestion = {
  id: string;
  type: string;
  question: string;
  signal: string;
  followUp?: string;
};

type GenerateResponse = {
  questions?: unknown;
};

const SYSTEM_PROMPT = `You are a senior technical recruiter and interview coach.
Generate targeted interview practice questions.
Return ONLY valid JSON with this exact shape:
{
  "questions": [
    {
      "id": "q1",
      "type": "behavioral | technical | product | system-design | recruiter",
      "question": "question text",
      "signal": "what a strong answer should demonstrate",
      "followUp": "optional probing follow-up"
    }
  ]
}`;

function normalizeQuestion(value: unknown, index: number): InterviewQuestion | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const question = getString(record.question);
  if (!question) return null;

  const followUp = getString(record.followUp);

  return {
    id: getString(record.id) || `q${index + 1}`,
    type: getString(record.type) || "behavioral",
    question,
    signal: getString(record.signal) || "Clear structure, evidence, tradeoffs, and measurable impact.",
    ...(followUp ? { followUp } : {}),
  };
}

function normalizeQuestions(payload: GenerateResponse | InterviewQuestion[]): InterviewQuestion[] {
  const source = Array.isArray(payload) ? payload : payload.questions;
  if (!Array.isArray(source)) return [];

  return source
    .map((question, index) => normalizeQuestion(question, index))
    .filter((question): question is InterviewQuestion => Boolean(question))
    .slice(0, 8);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const company = getString(body.company);
    const companyName = getString(body.companyName) || company;
    const role = getString(body.role);
    const jobDescription = getString(body.jobDescription);
    const difficulty = getString(body.difficulty) || "mid-level";
    const focusAreas = Array.isArray(body.focusAreas)
      ? body.focusAreas.map(getString).filter(Boolean).slice(0, 6)
      : [];
    const requestedCount = typeof body.questionCount === "number" ? body.questionCount : 5;
    const questionCount = Math.min(8, Math.max(3, Math.round(requestedCount)));

    if (!role) {
      return NextResponse.json({ error: "Role is required." }, { status: 400 });
    }

    const companyBrief = companyName
      ? await CompanyInterviewService.getOrGenerateBrief(companyName).catch(() => null)
      : null;

    const { data } = await callClaudeJson<GenerateResponse | InterviewQuestion[]>({
      system: SYSTEM_PROMPT,
      user: JSON.stringify({
        role,
        company: companyName || "Target company",
        jobDescription,
        difficulty,
        focusAreas,
        questionCount,
        companySpecificContext: companyBrief,
        instruction: companyBrief
          ? `Generate questions that match this company's known interview style. Include ${JSON.stringify(companyBrief.roundDescriptions[0] ?? "first-round screen")} style questions where relevant. Always phrase known questions as candidate-reported themes.`
          : "Make questions specific to the role and job context. Mix behavioral and role-relevant technical depth.",
      }),
      maxTokens: 2200,
    });

    const questions = normalizeQuestions(data);
    if (questions.length < 3) {
      return NextResponse.json({ error: "Claude returned too few usable questions." }, { status: 422 });
    }

    const interviewSession = await prisma.interviewSession.create({
      data: {
        userId,
        company: companyName || null,
        role,
        questions: questions as unknown as Prisma.InputJsonValue,
        answers: [],
      },
    });

    return NextResponse.json({
      sessionId: interviewSession.id,
      questions,
      companyBrief,
    });
  } catch (error) {
    console.error("[InterviewGenerate]", error);
    const message = error instanceof SyntaxError
      ? "Claude returned invalid JSON. Please try again."
      : error instanceof Error
        ? error.message
        : "Unable to generate interview questions.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
