import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { OpportunityIntelligenceService } from "@/lib/job-intelligence/opportunity-intelligence";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ranked = await OpportunityIntelligenceService.getRankedOpportunities(session.user.id);
    return NextResponse.json({ opportunities: ranked });
  } catch (error) {
    logger.error({ error }, "[GET /api/v1/opportunities] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
