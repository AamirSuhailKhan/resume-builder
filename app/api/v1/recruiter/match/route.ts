import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { RecruiterService } from "@/lib/recruiter/recruiter.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobTitle = searchParams.get("jobTitle");
    if (!jobTitle) {
      return NextResponse.json({ error: "Missing jobTitle parameter" }, { status: 400 });
    }

    const matching = await RecruiterService.getMatchingRecruiters(session.user.id, jobTitle);

    return NextResponse.json({ matching });
  } catch (error) {
    logger.error({ error }, "[GET /api/v1/recruiter/match] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
