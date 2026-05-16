import { prisma } from "@/lib/db/prisma";
import type { ComputeAnalyticsPayload } from "@/lib/queue/types";
import { AnalyticsService } from "@/lib/services/analytics.service";

export async function handleComputeAnalytics(payload: ComputeAnalyticsPayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  const existing = await prisma.applicationAnalytics.findUnique({ where: { userId: payload.userId } });
  if (!existing || Date.now() - existing.lastComputedAt.getTime() > 60 * 60 * 1000) {
    await AnalyticsService.computeUserAnalytics(payload.userId);
  }

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "completed", completedAt: new Date() },
  });

  return { userId: payload.userId };
}
