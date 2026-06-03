import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewAIV4Service } from "@/lib/interview-ai-v4/service";
import type { HiringSetup } from "@/lib/interview-ai-v4/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sourceProfileSchema = z.object({
  source: z.string(),
  rawText: z.string().min(80),
  summary: z.string().nullable(),
  skills: z.array(z.string()),
  experienceSignals: z.array(z.string()),
  senioritySignals: z.array(z.string()),
  projectSignals: z.array(z.string()),
});

const jdProfileSchema = z.object({
  source: z.string(),
  rawText: z.string().refine(
    (val) => val.split(/\s+/).filter(Boolean).length >= 5,
    "Job description must have at least 5 words."
  ),
  skills: z.array(z.string()),
  requirements: z.array(z.string()),
  responsibilities: z.array(z.string()),
  signals: z.array(z.string()),
  keywords: z.array(z.string()),
  seniority: z.string().nullable(),
});

const profileSchema = z.object({
  setup: z.object({
    companyName: z.string().trim().min(1, "Company is required."),
    roleTitle: z.string().trim().min(1, "Role is required."),
    experienceLevel: z.string().trim().min(1, "Experience level is required."),
    targetLocation: z.string().trim().optional(),
    compensationTarget: z.string().trim().optional(),
  }),
  resume: sourceProfileSchema,
  jd: jdProfileSchema,
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    console.log("REQUEST BODY", body);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid profile request.", 400);
    }

    const setup: HiringSetup = {
      companyName: parsed.data.setup.companyName,
      roleTitle: parsed.data.setup.roleTitle,
      experienceLevel: parsed.data.setup.experienceLevel,
      ...(parsed.data.setup.targetLocation ? { targetLocation: parsed.data.setup.targetLocation } : {}),
      ...(parsed.data.setup.compensationTarget ? { compensationTarget: parsed.data.setup.compensationTarget } : {}),
    };

    const profile = await InterviewAIV4Service.generateProfile({
      userId: user.id,
      setup,
      resume: parsed.data.resume,
      jd: parsed.data.jd,
    });

    return apiOk(profile, 201);
  } catch (error) {
    console.error("SERVER ERROR", error);
    return errorToResponse(error);
  }
}
