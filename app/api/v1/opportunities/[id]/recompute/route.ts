import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpportunityIntelligenceService } from "@/lib/job-intelligence/opportunity-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await props.params;

    const intelligence = await OpportunityIntelligenceService.computeOpportunityIntelligence(jobId, session.user.id);
    return NextResponse.json({ intelligence });
  } catch (error) {
    logger.error({ error }, "[POST /api/v1/opportunities/[id]/recompute] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
