import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NetworkingService } from "@/lib/networking/networking.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.contactId || !body.type || !body.description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const activity = await NetworkingService.logActivity({
      contactId: body.contactId,
      type: body.type,
      description: body.description,
      outcome: body.outcome,
      date: body.date ? new Date(body.date) : undefined
    });

    return NextResponse.json({ activity });
  } catch (error) {
    logger.error({ error }, "[POST /api/v1/networking/activities] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
