import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { GhostJobDetector } from "@/lib/job-intelligence/ghost-detector";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return apiError("Please sign in to continue.", 401);

    const p = await params;
    const jobId = p.id;
    if (!jobId) return apiError("Job ID is required", 400);

    const job = await prisma.jobOpportunity.findUnique({
      where: { id: jobId },
    });

    if (!job) return apiError("Job not found", 404);
    if (job.userId !== userId) return apiError("Forbidden", 403);

    const detector = new GhostJobDetector();
    const { score, signals, verdict } = await detector.score(job);

    const updatedJob = await prisma.jobOpportunity.update({
      where: { id: job.id },
      data: {
        ghostScore: score,
        ghostSignals: { signals, verdict, detectedAt: new Date().toISOString() },
        lastVerifiedAt: new Date(),
      },
    });

    return apiOk({
      id: updatedJob.id,
      ghostScore: score,
      ghostVerdict: verdict,
      signals,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
