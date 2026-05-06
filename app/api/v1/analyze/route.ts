import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { enqueueResumeAnalysis } from "@/lib/queue/producer";

export const runtime = "nodejs";

const analyzeSchema = z.object({
  resumeId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid resume ID.", 400);

    const resume = await prisma.resume.findFirst({
      where: { id: parsed.data.resumeId, userId: user.id },
      select: { id: true },
    });
    if (!resume) return apiError("Resume not found.", 404);

    const jobRecord = await prisma.job.create({
      data: {
        type: "ats_analysis",
        status: "queued",
        userId: user.id,
        resumeId: resume.id,
        payload: parsed.data as Prisma.InputJsonValue,
      },
    });

    const job = await enqueueResumeAnalysis({
      jobRecordId: jobRecord.id,
      userId: user.id,
      resumeId: resume.id,
    });

    return apiOk({ jobId: jobRecord.id, bullJobId: job.id, status: "queued" }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
