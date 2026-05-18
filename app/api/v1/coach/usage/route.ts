import { NextResponse } from "next/server";
import { getUserPlan } from "@/lib/auth/require-pro";
import { requireUser } from "@/lib/auth/session";
import { meetsPlan } from "@/lib/subscription/plans";
import { CoachService } from "@/lib/services/coach.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const plan = await getUserPlan(user.id);
    if (!meetsPlan(plan, "pro")) {
      return NextResponse.json({ used: 0, limit: 0, resetsAt: null, plan });
    }
    const usage = await CoachService.getUsage(user.id, plan);
    return NextResponse.json({ ...usage, plan });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
