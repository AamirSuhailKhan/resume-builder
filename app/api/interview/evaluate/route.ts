import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { CompanyInterviewService } from "@/lib/services/company-interview.service";
import { callClaudeJson, getNumber, getString } from "../_lib/claude";

export const runtime = "nodejs";

type QuestionAnswer = {
  questionId: string;
  question: string;
  answer: string;
};

type RubricPoint = {
  metric: string;
  score: number;
  feedback: string;
};

type Evaluation = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextDrill: string;
  rubric: RubricPoint[];
};

type EvaluationResponse = Partial<Evaluation>;

const SYSTEM_PROMPT = `You are a strict but constructive interview evaluator.
Evaluate answers against hiring signals for the target role.
Return ONLY valid JSON with this exact shape:
{
  "score": 0-100,
  "summary": "two sentence overall assessment",
  "strengths": ["specific strength"],
  "improvements": ["specific improvement"],
  "nextDrill": "one focused practice drill",
  "rubric": [
    { "metric": "Structure", "score": 0-100, "feedback": "short note" },
    { "metric": "Specificity", "score": 0-100, "feedback": "short note" },
    { "metric": "Role Fit", "score": 0-100, "feedback": "short note" },
    { "metric": "Impact", "score": 0-100, "feedback": "short note" },
    { "metric": "Communication", "score": 0-100, "feedback": "short note" }
  ]
}`;

function clampScore(value: unknown, fallback: number): number {
  return Math.min(100, Math.max(0, Math.round(getNumber(value, fallback))));
}

function getStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;

  const strings = value.map(getString).filter(Boolean).slice(0, 6);
  return strings.length > 0 ? strings : fallback;
}

function normalizeRubric(value: unknown): RubricPoint[] {
  const fallbackMetrics = ["Structure", "Specificity", "Role Fit", "Impact", "Communication"];
  const source = Array.isArray(value) ? value : [];
  const rubric = source
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      return {
        metric: getString(record.metric) || fallbackMetrics[index] || `Signal ${index + 1}`,
        score: clampScore(record.score, 60),
        feedback: getString(record.feedback) || "Add clearer evidence and outcome detail.",
      };
    })
    .filter((item): item is RubricPoint => Boolean(item))
    .slice(0, 6);

  if (rubric.length > 0) return rubric;

  return fallbackMetrics.map((metric) => ({
    metric,
    score: 60,
    feedback: "Claude did not return this rubric detail.",
  }));
}

function normalizeEvaluation(payload: EvaluationResponse): Evaluation {
  const rubric = normalizeRubric(payload.rubric);
  const rubricAverage = Math.round(rubric.reduce((sum, item) => sum + item.score, 0) / rubric.length);

  return {
    score: clampScore(payload.score, rubricAverage),
    summary: getString(payload.summary) || "Your answers show useful signal, but need sharper evidence and outcomes.",
    strengths: getStringArray(payload.strengths, ["You addressed the prompt and showed relevant experience."]),
    improvements: getStringArray(payload.improvements, ["Add more concrete metrics, tradeoffs, and final business impact."]),
    nextDrill: getString(payload.nextDrill) || "Re-answer the weakest question using situation, decision, action, result in under 90 seconds.",
    rubric,
  };
}

function normalizeAnswers(value: unknown): QuestionAnswer[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = getString(record.question);
      const answer = getString(record.answer);

      if (!question || !answer) return null;

      return {
        questionId: getString(record.questionId),
        question,
        answer,
      };
    })
    .filter((item): item is QuestionAnswer => Boolean(item));
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

    const answers = normalizeAnswers(body.answers);
    if (answers.length === 0) {
      return NextResponse.json({ error: "At least one answered question is required." }, { status: 400 });
    }

    const sessionId = getString(body.sessionId);
    const company = getString(body.company);
    const companyName = getString(body.companyName) || company;
    const role = getString(body.role);
    const jobDescription = getString(body.jobDescription);
    const companyBrief = companyName
      ? await CompanyInterviewService.getOrGenerateBrief(companyName).catch(() => null)
      : null;

    const { data } = await callClaudeJson<EvaluationResponse>({
      system: SYSTEM_PROMPT,
      user: JSON.stringify({
        company: companyName,
        role,
        jobDescription,
        companySpecificContext: companyBrief,
        answers,
        instruction: companyBrief
          ? `This was a ${companyName} interview. Their difficulty level is ${companyBrief.difficulty ?? "unknown"}. Calibrate the score relative to what this specific company expects.`
          : "Be direct and evidence-based. Reward concise, specific answers with measurable outcomes.",
      }),
      maxTokens: 2500,
    });

    const evaluation = normalizeEvaluation(data);

    let persistedSessionId = sessionId || null;
    if (sessionId) {
      const updated = await prisma.interviewSession.updateMany({
        where: { id: sessionId, userId },
        data: {
          answers: answers as unknown as Prisma.InputJsonValue,
          feedback: evaluation as unknown as Prisma.InputJsonValue,
          score: evaluation.score,
        },
      });

      if (updated.count === 0) {
        persistedSessionId = null;
      }
    }

    if (!persistedSessionId) {
      const created = await prisma.interviewSession.create({
        data: {
          userId,
          company: companyName || null,
          role: role || null,
          questions: answers.map((answer) => ({
            id: answer.questionId,
            question: answer.question,
          })) as unknown as Prisma.InputJsonValue,
          answers: answers as unknown as Prisma.InputJsonValue,
          feedback: evaluation as unknown as Prisma.InputJsonValue,
          score: evaluation.score,
        },
      });
      persistedSessionId = created.id;
    }

    return NextResponse.json({
      sessionId: persistedSessionId,
      ...evaluation,
      radar: evaluation.rubric.map((item) => ({
        metric: item.metric,
        score: item.score,
      })),
    });
  } catch (error) {
    console.error("[InterviewEvaluate]", error);
    const message = error instanceof SyntaxError
      ? "Claude returned invalid JSON. Please try again."
      : error instanceof Error
        ? error.message
        : "Unable to evaluate interview answers.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
