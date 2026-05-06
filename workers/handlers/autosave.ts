import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { AutosavePayload } from "@/lib/queue/types";

const VERSION_INTERVAL_MS = 5 * 60 * 1000;

async function maybeCreateVersion(payload: AutosavePayload, nextVersion: number) {
  const latest = await prisma.resumeVersion.findFirst({
    where: { resumeId: payload.resumeId, userId: payload.userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const shouldCreate =
    payload.createVersion ||
    !latest ||
    Date.now() - latest.createdAt.getTime() >= VERSION_INTERVAL_MS;

  if (!shouldCreate) return;

  await prisma.resumeVersion.create({
    data: {
      resumeId: payload.resumeId,
      userId: payload.userId,
      version: nextVersion,
      title: payload.title,
      data: payload.data as Prisma.InputJsonValue,
    },
  });
}

export async function handleAutosave(payload: AutosavePayload) {
  const normalized = normalizeResume({
    ...payload.data,
    id: payload.resumeId,
    title: payload.title,
  });

  return prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: payload.jobRecordId },
      data: { status: "processing", attempts: { increment: 1 }, lastError: null },
    });

    const current = await tx.resume.findFirst({
      where: { id: payload.resumeId, userId: payload.userId },
      select: { id: true, version: true },
    });

    if (!current) {
      throw new Error("RESUME_NOT_FOUND");
    }

    const nextVersion = current.version + 1;

    await tx.resume.update({
      where: { id: payload.resumeId },
      data: {
        title: payload.title,
        data: normalized as unknown as Prisma.InputJsonValue,
        status: "completed",
        version: nextVersion,
      },
    });

    await maybeCreateVersion(payload, nextVersion);

    await tx.job.update({
      where: { id: payload.jobRecordId },
      data: { status: "completed", completedAt: new Date() },
    });

    return { resumeId: payload.resumeId, version: nextVersion };
  });
}
