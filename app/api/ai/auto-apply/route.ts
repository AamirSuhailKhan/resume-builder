import { z } from "zod";
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

    const jobRecord = await prisma.job.create({
      data: {
        userId: user.id,
        resumeId: parsed.resumeId,
        type: "ai_auto_apply",
        status: "queued",
        payload: parsed,
      },
    });

    await enqueueAutoApply({
      jobRecordId: jobRecord.id,
      userId: user.id,
      resumeId: parsed.resumeId,
      jobOpportunityId: parsed.jobOpportunityId,
      preview: parsed.preview,
    });

    return apiOk({ jobRecordId: jobRecord.id, status: "queued" }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
