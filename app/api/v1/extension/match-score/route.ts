import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { description } = body as { description?: string };

    if (!description || description.trim().length < 20) {
      return apiOk({ score: 0 });
    }

    const cacheKey = `ext_match:${user.id}:${createHash("sha256")
      .update(description.slice(0, 200))
      .digest("hex")}`;

    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get<number>(cacheKey);
      if (cached !== null) return apiOk({ score: cached });
    }

    // Load user's latest resume skills
    const resume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { data: true },
    });

    const data = (resume?.data ?? {}) as Record<string, unknown>;
    const skills: string[] = [];

    if (Array.isArray(data.skills)) {
      for (const s of data.skills) {
        if (typeof s === "string") skills.push(s.toLowerCase());
        else if (typeof s === "object" && s !== null && "name" in s) {
          skills.push(String((s as { name: unknown }).name).toLowerCase());
        }
      }
    }

    // Simple keyword overlap score — fast, no AI, < 200ms
    const descLower = description.toLowerCase();
    const matches = skills.filter((s) => descLower.includes(s)).length;
    const score = Math.min(99, Math.round((matches / Math.max(1, skills.length)) * 100) + 20);

    if (redis) {
      redis.set(cacheKey, score, { ex: 30 * 60 }).catch(() => {});
    }

    return apiOk({ score });
  } catch (error) {
    return errorToResponse(error);
  }
}
