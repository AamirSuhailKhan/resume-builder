import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getUserPlan } from "@/lib/auth/require-pro";
import { CoachService } from "@/lib/services/coach.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const plan = await getUserPlan(user.id);
    const teaser = await CoachService.getTeaserForUser(user.id);
    return NextResponse.json({ ...teaser, plan });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
