import { prisma } from "@/lib/db/prisma";
import { ExportPdfPayload } from "@/lib/queue/types";

export async function handleExportPdf(payload: ExportPdfPayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  const resume = await prisma.resume.findFirst({
    where: { id: payload.resumeId, userId: payload.userId },
    select: { id: true },
  });

  if (!resume) throw new Error("RESUME_NOT_FOUND");

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: {
        ...payload,
        exportUrl: null,
        note: "PDF rendering should run in a dedicated browser-capable worker.",
      },
    },
  });

  return { resumeId: payload.resumeId, exportUrl: null };
}
