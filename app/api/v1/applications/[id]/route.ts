import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { enqueueAnalyticsCompute } from "@/lib/queue/producer";
import { MilestoneService } from "@/lib/services/milestone.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  stage: z.enum(["Applied", "Interview", "Rejected", "Offer"]).optional(),
  status: z.enum(["applied", "interview", "rejected", "offer"]).optional(),
});

const statusMap = {
  Applied: "applied",
  Interview: "interview",
  Rejected: "rejected",
  Offer: "offer",
} as const;

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const status = parsed.data.status ?? (parsed.data.stage ? statusMap[parsed.data.stage] : undefined);
  if (!status) return NextResponse.json({ error: "Status is required." }, { status: 400 });

  const updated = await prisma.application.updateMany({
    where: { id, userId },
    data: { status },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const job = await prisma.job.create({
    data: {
      type: "compute_analytics",
      userId,
      payload: { applicationId: id },
    },
  });
  await enqueueAnalyticsCompute({ jobRecordId: job.id, userId }).catch(() => undefined);

  const milestones = await MilestoneService.checkAndAwardMilestones(userId);
  return NextResponse.json({ ok: true, milestones });
}
