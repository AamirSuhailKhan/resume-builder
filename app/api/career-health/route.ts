import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CareerHealthService } from "@/lib/services/career-health.service";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await CareerHealthService.getHealthHistory(userId);
    const latest = history.length > 0 
      ? history[history.length - 1] 
      : await CareerHealthService.getLatestSnapshot(userId);
      
    return NextResponse.json({ latest, history });
  } catch (error: any) {
    console.error("Failed to fetch career health data:", error);
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
    const fresh = await CareerHealthService.calculateAndSaveSnapshot(userId);
    return NextResponse.json(fresh);
  } catch (error: any) {
    console.error("Failed to recalculate career health:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
