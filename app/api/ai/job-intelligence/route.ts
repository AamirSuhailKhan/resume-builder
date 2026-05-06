import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { enqueueJobIntelligence } from "@/lib/queue/producer";

export const runtime = "nodejs";

const requestSchema = z.object({
  jobDescription: z.string().trim().min(40).max(20000),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return apiError("Paste a complete job description.", 400);

    const jobRecord = await prisma.job.create({
      data: {
        userId: user.id,
        type: "ai_job_intelligence",
        status: "queued",
        payload: parsed.data,
      },
    });

    await enqueueJobIntelligence({
      jobRecordId: jobRecord.id,
      userId: user.id,
      jobDescription: parsed.data.jobDescription,
    });

    return apiOk({ jobRecordId: jobRecord.id, status: "queued" }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
