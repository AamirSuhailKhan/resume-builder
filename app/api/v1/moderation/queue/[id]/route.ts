import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveSchema = z.object({
  status:     z.enum(["resolved", "dismissed", "in_review"]),
  resolution: z.string().max(1000).optional(),
});

// PATCH /api/v1/moderation/queue/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid resolution data.", 400);

    const item = await prisma.moderationQueueItem.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolution: parsed.data.resolution ?? null,
        resolvedAt: parsed.data.status === "resolved" || parsed.data.status === "dismissed"
          ? new Date() : null,
      },
    });

    // If resolving a fraud case, update the contribution status
    if (parsed.data.status === "resolved" && item.entityType === "InterviewContribution") {
      await prisma.interviewContribution.update({
        where: { id: item.entityId },
        data: { status: "approved" },
      }).catch(() => undefined);
    }
    if (parsed.data.status === "dismissed" && item.entityType === "InterviewContribution") {
      await prisma.interviewContribution.update({
        where: { id: item.entityId },
        data: { status: "rejected" },
      }).catch(() => undefined);
    }

    return apiOk(item);
  } catch (error) {
    return errorToResponse(error);
  }
}
