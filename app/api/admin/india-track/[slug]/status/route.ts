import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const adminSecret = req.headers.get("x-admin-secret");
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { hiringStatus } = await req.json();
    if (!hiringStatus || !["high", "normal", "frozen"].includes(hiringStatus)) {
      return new NextResponse("Invalid hiringStatus", { status: 400 });
    }

    const updated = await prisma.indiaCompanyTrack.update({
      where: { companySlug: params.slug },
      data: { hiringStatus, lastUpdated: new Date() },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[INDIA_TRACK_ADMIN_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
