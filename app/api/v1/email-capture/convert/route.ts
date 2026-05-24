import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.userId) {
      return NextResponse.json({ error: "Missing email or userId" }, { status: 400 });
    }

    const { email, userId } = body;

    const existing = await prisma.emailCapture.findUnique({
      where: { email },
    });

    if (existing) {
      const updated = await prisma.emailCapture.update({
        where: { email },
        data: {
          convertedAt: new Date(),
          userId,
        },
      });
      return NextResponse.json({ success: true, updated: updated.id });
    }

    return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[CONVERT API] Conversion failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during conversion" },
      { status: 500 }
    );
  }
}
