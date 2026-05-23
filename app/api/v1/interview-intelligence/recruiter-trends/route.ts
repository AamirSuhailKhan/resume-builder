import { NextRequest } from "next/server";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { RecruiterTrendEngine } from "@/lib/interview-intelligence/recruiter-trends.engine";
import { prisma } from "@/lib/db/prisma";
import { normalizeText } from "@/lib/interview-intelligence/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const companyName = req.nextUrl.searchParams.get("company");
    const companySlug = req.nextUrl.searchParams.get("slug");

    if (!companyName && !companySlug) {
      return apiError("company or slug parameter required", 400);
    }

    const company = await prisma.company.findFirst({
      where: companyName
        ? { OR: [{ normalizedName: normalizeText(companyName) }, { name: { contains: companyName, mode: "insensitive" } }] }
        : { slug: companySlug! },
      select: { id: true },
    });
    if (!company) return apiError("Company not found", 404);

    const report = await RecruiterTrendEngine.getReport(company.id);
    if (!report) return apiError("No trend data available for this company", 404);

    return apiOk(report);
  } catch (error) {
    return errorToResponse(error);
  }
}
