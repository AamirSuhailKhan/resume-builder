import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NetworkingService } from "@/lib/networking/networking.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company");
    if (!company) {
      return NextResponse.json({ error: "Company parameter is required" }, { status: 400 });
    }

    const suggestions = await NetworkingService.suggestWarmIntros(session.user.id, company);
    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error({ error }, "[GET /api/v1/networking/intros] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
