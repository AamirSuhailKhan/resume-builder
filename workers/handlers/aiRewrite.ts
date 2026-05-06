import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { improveResume } from "@/lib/ai";
import { normalizeResume } from "@/lib/normalizeResume";
import { AiRewritePayload } from "@/lib/queue/types";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function handleAiRewrite(payload: AiRewritePayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  const resume = await prisma.resume.findFirst({
    where: { id: payload.resumeId, userId: payload.userId },
  });

  if (!resume) throw new Error("RESUME_NOT_FOUND");

  const improved = await withTimeout(improveResume(normalizeResume(resume.data)), 60000);

  await prisma.resume.update({
    where: { id: payload.resumeId },
    data: {
      data: improved as unknown as Prisma.InputJsonValue,
      status: "completed",
      version: { increment: 1 },
    },
  });

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "completed", completedAt: new Date() },
  });

  return { resumeId: payload.resumeId };
}
