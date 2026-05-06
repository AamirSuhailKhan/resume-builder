import { prisma } from "@/lib/db/prisma";
import { calculateLocalATSScore } from "@/lib/ats";
import { normalizeResume } from "@/lib/normalizeResume";
import { AtsAnalysisPayload } from "@/lib/queue/types";

export async function handleAtsAnalysis(payload: AtsAnalysisPayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  const resume = await prisma.resume.findFirst({
    where: { id: payload.resumeId, userId: payload.userId },
  });

  if (!resume) throw new Error("RESUME_NOT_FOUND");

  const result = calculateLocalATSScore(normalizeResume(resume.data));

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: {
        ...payload,
        result,
      },
    },
  });

  return result;
}
