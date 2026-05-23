import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkDailyRateLimit } from "@/lib/security/ratelimit";
import { CompanyDashboardService } from "@/lib/services/company-dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await checkDailyRateLimit(userId, 50, "company_dashboard");
  if (!limited.allowed) {
    return NextResponse.json({ error: "Daily dashboard lookup limit reached." }, { status: 429 });
  }

  const { name: slug } = await context.params;
  if (!slug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

  try {
    const data = await CompanyDashboardService.getDashboard(slug, forceRefresh);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard data" }, { status: 500 });
  }
}
