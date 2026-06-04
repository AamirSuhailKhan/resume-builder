/**
 * app/api/v1/agent/memory/route.ts
 *
 * Retrieves persistent agent memories from the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const memories = await prisma.twinMemory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, memories }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[API /agent/memory] Failure");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
