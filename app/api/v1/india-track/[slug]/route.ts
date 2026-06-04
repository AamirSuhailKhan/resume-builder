import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

import { errorToResponse } from "@/lib/api/response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser();
    const { slug } = await params;
    const company = await prisma.indiaCompanyTrack.findUnique({
      where: { companySlug: slug },
    });

    if (!company) {
      return new NextResponse("Company not found", { status: 404 });
    }

    return NextResponse.json({ data: company });
  } catch (error) {
    return errorToResponse(error);
  }
}
