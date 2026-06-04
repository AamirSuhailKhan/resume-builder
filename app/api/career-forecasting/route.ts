import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CareerForecastingService } from "@/lib/services/career-forecasting.service";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const forecasts = await CareerForecastingService.getForecasts(userId);
    return NextResponse.json(forecasts);
  } catch (error: any) {
    console.error("Failed to fetch career forecasting data:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Explicit regeneration/refresh of forecasts
    const forecasts = await CareerForecastingService.getForecasts(userId);
    return NextResponse.json(forecasts);
  } catch (error: any) {
    console.error("Failed to regenerate career forecasting data:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
