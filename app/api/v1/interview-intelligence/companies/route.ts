import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { normalizeText, slugify } from "@/lib/interview-intelligence/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = (searchParams.get("q") || "").trim();
    const normalizedQuery = normalizeText(query);

    const companies = await prisma.company.findMany({
      ...(query ? {
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { normalizedName: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } }
          ]
        }
      } : {}),
      orderBy: { name: "asc" },
      take: 20
    });

    const hasExact = companies.some((company) => company.normalizedName === normalizedQuery);
    const createOption = query && !hasExact
      ? [{
          id: `typed:${slugify(query) || "company"}`,
          name: query,
          normalizedName: normalizedQuery,
          slug: slugify(query) || normalizedQuery,
          companyType: "user_target",
          tier: null,
          industry: null,
          fresherFriendliness: null,
          referralDominance: null,
          collegeTierBias: null,
          intelligence: { source: "typed_company", hasStoredCompanyIntelligence: false },
          createdAt: new Date().toISOString(),
          isTypedOption: true,
        }]
      : [];

    return apiOk([...companies, ...createOption]);
  } catch (error) {
    return errorToResponse(error);
  }
}
