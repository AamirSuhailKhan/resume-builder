import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { enqueueAutoApply } from "@/lib/queue/producer";

export const runtime = "nodejs";

const requestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  jobOpportunityId: z.string().uuid().optional(),
  preview: z.string().max(30000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.parse(body ?? {});
    const jobPayload = {
      ...(parsed.resumeId ? { resumeId: parsed.resumeId } : {}),
      ...(parsed.jobOpportunityId ? { jobOpportunityId: parsed.jobOpportunityId } : {}),
      ...(parsed.preview ? { preview: parsed.preview } : {}),
    } satisfies Prisma.InputJsonObject;

    const jobRecord = await prisma.job.create({
      data: {
        userId: user.id,
        resumeId: parsed.resumeId ?? null,
        type: "ai_auto_apply",
        status: "queued",
        payload: jobPayload,
      },
    });

    const queuePayload = {
      jobRecordId: jobRecord.id,
      userId: user.id,
      ...(parsed.resumeId ? { resumeId: parsed.resumeId } : {}),
      ...(parsed.jobOpportunityId ? { jobOpportunityId: parsed.jobOpportunityId } : {}),
      ...(parsed.preview ? { preview: parsed.preview } : {}),
    };

    await enqueueAutoApply(queuePayload);

    return apiOk({ jobRecordId: jobRecord.id, status: "queued" }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
