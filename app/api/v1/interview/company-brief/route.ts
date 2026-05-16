import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CompanyInterviewService } from "@/lib/services/company-interview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyName = req.nextUrl.searchParams.get("companyName")?.trim();
  if (!companyName) return NextResponse.json({ error: "companyName is required." }, { status: 400 });

  const brief = await CompanyInterviewService.getOrGenerateBrief(companyName);
  return NextResponse.json({ brief });
}
