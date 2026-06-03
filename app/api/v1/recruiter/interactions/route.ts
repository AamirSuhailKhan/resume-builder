import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { RecruiterService } from "@/lib/recruiter/recruiter.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.recruiterId || !body.type || !body.status) {
      return NextResponse.json({ error: "Missing recruiterId, type, or status" }, { status: 400 });
    }

    const interaction = await RecruiterService.logInteraction({
      recruiterId: body.recruiterId,
      type: body.type,
      status: body.status,
      responseTimeDays: body.responseTimeDays ? parseFloat(body.responseTimeDays) : undefined,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined
    });

    return NextResponse.json({ interaction });
  } catch (error) {
    logger.error({ error }, "[POST /api/v1/recruiter/interactions] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
