import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { MilestoneService } from "@/lib/services/milestone.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["first_application", "tenth_application", "first_response", "first_interview", "offer_received"]),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const newlyAwarded = await MilestoneService.checkAndAwardMilestones(userId);
  const milestones = await prisma.searchMilestone.findMany({ where: { userId }, orderBy: { achievedAt: "desc" } });
  return NextResponse.json({ milestones, newlyAwarded });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const milestone = await prisma.searchMilestone.upsert({
    where: { userId_type: { userId, type: parsed.data.type } },
    create: { userId, type: parsed.data.type },
    update: {},
  });

  return NextResponse.json({
    milestone,
    message: `${MilestoneService.label(milestone.type)} unlocked. That progress counts.`,
  });
}
