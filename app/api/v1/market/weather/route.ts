import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { MarketWeatherService } from "@/lib/services/market-weather.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  let role = url.searchParams.get("role");
  let industry = url.searchParams.get("industry") || "Technology";
  let location = url.searchParams.get("location");

  if (!role || !location) {
    const profile = await prisma.careerProfile.findUnique({
      where: { userId: session.user.id },
      include: { 
        user: { 
          include: { 
            resumes: { take: 1, orderBy: { updatedAt: 'desc' } }, 
            applications: { take: 1, orderBy: { createdAt: 'desc' } } 
          } 
        } 
      }
    });

    if (!role) {
      role = profile?.headline || 
             (profile?.user.resumes[0]?.data as any)?.personalInfo?.title ||
             profile?.user.applications[0]?.role ||
             "Software Engineer";
    }

    if (!location) {
      const prefs = profile?.preferences as any;
      location = prefs?.locations?.[0] || 
                 (profile?.user.resumes[0]?.data as any)?.personalInfo?.location ||
                 "Remote";
    }
  }

  try {
    const finalRole = role || "Software Engineer";
    const finalLocation = location || "Remote";
    const result = await MarketWeatherService.generateWeeklyReport(finalRole, industry, finalLocation);
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    console.error("[MarketWeatherAPI] Error generating report", err);
    return NextResponse.json(
      { data: null, error: "Failed to generate market weather report" },
      { status: 500 }
    );
  }
}
