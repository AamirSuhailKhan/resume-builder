import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReadinessRequestSchema = z.object({
  roleTitle: z.string().trim().min(1, "Role title is required."),
  companyName: z.string().trim().optional(),
  resumeText: z.string().trim().min(80, "Resume text must be at least 80 characters."),
  jobDescription: z.string().trim().min(80, "Job description must be at least 80 characters."),
  sessionId: z.string().uuid().optional(),
});

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = ReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Invalid readiness request.", 400);
    }

    const { roleTitle, companyName, resumeText, jobDescription, sessionId } = parsed.data;
    const resume = InterviewAIV4Service.parseResumeText(resumeText, "inline_readiness_request");
    const jd = InterviewAIV4Service.parseJobDescription(jobDescription, "inline_readiness_request");

    const latestEvaluation = await prisma.interviewEvaluation.findFirst({
      where: {
        userId: user.id,
        ...(sessionId ? { sessionId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const readiness = InterviewAIV4Service.calculateReadiness(
      latestEvaluation
        ? {
            resume,
            jd,
            mockScores: {
              overall: latestEvaluation.score,
              behavioral: latestEvaluation.score,
              communication: latestEvaluation.score,
              systemDesign: latestEvaluation.score,
              domain: latestEvaluation.score,
            },
          }
        : { resume, jd }
    );

    await prisma.readinessSnapshot.create({
      data: {
        userId: user.id,
        sessionId: sessionId ?? null,
        companyName: companyName ?? null,
        roleTitle,
        overallScore: readiness.overallScore,
        resumeMatchScore: readiness.components.find((component) => component.key === "resumeMatch")?.score ?? 0,
        jdMatchScore: readiness.components.find((component) => component.key === "jdMatch")?.score ?? 0,
        skillCoverageScore: readiness.components.find((component) => component.key === "skillCoverage")?.score ?? 0,
        mockPerformanceScore: readiness.components.find((component) => component.key === "mockPerformance")?.score ?? null,
        behavioralScore: readiness.components.find((component) => component.key === "behavioral")?.score ?? null,
        communicationScore: readiness.components.find((component) => component.key === "communication")?.score ?? null,
        systemDesignScore: readiness.components.find((component) => component.key === "systemDesign")?.score ?? null,
        domainScore: readiness.components.find((component) => component.key === "domain")?.score ?? null,
        formulaTrace: json(readiness),
        explanations: json(readiness.components),
      },
    });

    return apiOk(readiness);
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
