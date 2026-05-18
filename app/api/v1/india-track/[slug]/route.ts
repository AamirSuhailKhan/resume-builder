import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const company = await prisma.indiaCompanyTrack.findUnique({
      where: { companySlug: params.slug },
    });

    if (!company) {
      return new NextResponse("Company not found", { status: 404 });
    }

    return NextResponse.json({ data: company });
  } catch (error) {
    console.error("[INDIA_TRACK_DETAIL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
