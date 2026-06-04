import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";

import { errorToResponse } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier");
    const hiringStatus = searchParams.get("hiringStatus");
    const dsaDifficulty = searchParams.get("dsaDifficulty");
    const search = searchParams.get("search");

    const where: Prisma.IndiaCompanyTrackWhereInput = {};

    if (tier && tier !== "all") {
      where.tier = tier;
    }
    
    if (hiringStatus && hiringStatus !== "all") {
      where.hiringStatus = hiringStatus;
    }
    
    if (dsaDifficulty && dsaDifficulty !== "all") {
      where.dsaDifficulty = dsaDifficulty;
    }

    if (search) {
      where.companyName = {
        contains: search,
        mode: "insensitive",
      };
    }

    const companies = await prisma.indiaCompanyTrack.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        companySlug: true,
        tier: true,
        logoEmoji: true,
        dsaDifficulty: true,
        salaryRanges: true,
        avgTimelineDays: true,
        hiringStatus: true,
        hiringProcess: true, // we need total rounds
        lastUpdated: true,
      },
    });

    // Custom sort: 'high' status first, then alphabetical
    const sorted = companies.sort((a, b) => {
      if (a.hiringStatus === "high" && b.hiringStatus !== "high") return -1;
      if (b.hiringStatus === "high" && a.hiringStatus !== "high") return 1;
      return a.companyName.localeCompare(b.companyName);
    });

    return NextResponse.json({ data: sorted });
  } catch (error) {
    return errorToResponse(error);
  }
}
