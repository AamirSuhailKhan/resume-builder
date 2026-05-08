import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { enqueuePortfolio } from "@/lib/queue/producer";

export const runtime = "nodejs";

const requestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  theme: z.enum(["editorial", "studio", "operator"]).default("editorial"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.parse(body ?? {});
    const jobPayload = {
      theme: parsed.theme,
      ...(parsed.resumeId ? { resumeId: parsed.resumeId } : {}),
    } satisfies Prisma.InputJsonObject;

    const jobRecord = await prisma.job.create({
      data: {
        userId: user.id,
        resumeId: parsed.resumeId ?? null,
        type: "ai_portfolio",
        status: "queued",
        payload: jobPayload,
      },
    });

    await enqueuePortfolio({
      jobRecordId: jobRecord.id,
      userId: user.id,
      ...(parsed.resumeId ? { resumeId: parsed.resumeId } : {}),
      theme: parsed.theme,
    });

    return apiOk({ jobRecordId: jobRecord.id, status: "queued" }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
