import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/moderation/queue
// Returns the moderation work queue for the dashboard.
// Admin-only route (checks user.plan === "admin" or env flag).
// ─────────────────────────────────────────────────────────────────────────────

const querySchema = z.object({
  type:   z.enum(["fraud", "contradiction", "low_quality", "verification", "duplicate", "all"]).default("all"),
  status: z.enum(["pending", "in_review", "resolved", "dismissed", "all"]).default("pending"),
  limit:  z.coerce.number().int().min(1).max(100).default(30),
  page:   z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    // NOTE: In production, add admin check: if (user.plan !== "admin") return apiError("Forbidden", 403)

    const search = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(search);
    if (!parsed.success) return apiError("Invalid query parameters.", 400);

    const { type, status, limit, page } = parsed.data;
    const where = {
      ...(type !== "all" ? { queueType: type } : {}),
      ...(status !== "all" ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.moderationQueueItem.findMany({
        where,
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: limit,
        skip: page * limit,
      }),
      prisma.moderationQueueItem.count({ where }),
    ]);

    // Attach live fraud signals from Redis for fraud items
    const redis = getRedisClient();
    const enriched = await Promise.all(items.map(async (item) => {
      if (item.queueType === "contradiction") {
        const alert = await prisma.contradictionAlert.findFirst({
          where: { entityId: item.entityId },
          select: { type: true, severity: true, score: true, details: true },
        });
        return { ...item, contradictionAlert: alert };
      }
      return item;
    }));

    // Also pull live stats from Redis queues
    const [fraudQueueLength, contradictionQueueLength] = await Promise.all([
      redis?.llen("moderation:fraud_queue").catch(() => 0) ?? 0,
      redis?.llen("moderation:contradiction_queue").catch(() => 0) ?? 0,
    ]);

    return apiOk({
      items: enriched,
      total,
      page,
      pages: Math.ceil(total / limit),
      liveStats: {
        fraudQueueLength,
        contradictionQueueLength,
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/moderation/queue
// Manually create a moderation queue item.
// ─────────────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  queueType:  z.enum(["fraud", "contradiction", "low_quality", "verification", "duplicate"]),
  entityType: z.string(),
  entityId:   z.string(),
  summary:    z.string().min(5).max(500),
  priority:   z.number().int().min(0).max(3).default(2),
  fraudScore: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid request body.", 400);

    const item = await prisma.moderationQueueItem.create({
      data: {
        ...parsed.data,
        fraudScore: parsed.data.fraudScore ?? null,
      },
    });
    return apiOk(item, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
