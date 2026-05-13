import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { AutosavePayload } from "@/lib/queue/types";
import { logger } from "@/lib/logger";

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

  const result = await prisma.$transaction(async (tx) => {
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

  // ── Async memory extraction — runs AFTER the transaction, never blocks autosave ──
  // Import lazily so the server-only service doesn't load in every worker context
  setImmediate(async () => {
    try {
      const { memoryService } = await import("@/lib/services/memory.service");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await memoryService.extractMemoriesFromResume(payload.userId, normalized as any);
      logger.info({ userId: payload.userId, resumeId: payload.resumeId }, "[autosave] Career memories updated.");
    } catch (err) {
      // Non-fatal — autosave already succeeded; memory extraction is best-effort
      logger.warn({ err, userId: payload.userId }, "[autosave] Memory extraction failed (non-fatal).");
    }
  });

  return result;
}
