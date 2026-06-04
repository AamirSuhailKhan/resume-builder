import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { OpportunityIntelligenceService } from "@/lib/job-intelligence/opportunity-intelligence";
import { logger } from "@/lib/logger";
import { CacheService, CacheKeys } from "@/lib/cache/cache.service";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await props.params;

    // Check Redis cache first — 24h TTL (intelligence is expensive to compute)
    const cacheKey = CacheKeys.jobIntelligence(jobId);
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { intelligence: cached },
        { headers: { "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600" } }
      );
    }

    const job = await prisma.jobOpportunity.findUnique({
      where: { id: jobId, userId: session.user.id },
      include: { intelligence: true }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If DB-stored intelligence is fresh, cache it and return
    if (job.intelligence && Date.now() - job.intelligence.computedAt.getTime() < 1000 * 60 * 60 * 24) {
      await CacheService.set(cacheKey, job.intelligence, 86400);
      return NextResponse.json(
        { intelligence: job.intelligence },
        { headers: { "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600" } }
      );
    }

    // Otherwise compute / recompute it
    const intelligence = await OpportunityIntelligenceService.computeOpportunityIntelligence(job.id, session.user.id);

    // Cache freshly computed result
    await CacheService.set(cacheKey, intelligence, 86400);

    return NextResponse.json(
      { intelligence },
      { headers: { "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600" } }
    );

  } catch (error) {
    logger.error({ error }, "[GET /api/v1/jobs/[jobId]/intelligence] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

