import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Upstash Redis client (serverless-safe)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Limiter: 20 requests per 10 seconds per IP
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  analytics: true,
  prefix: "ratelimit:general",
});

// Stricter for AI endpoints: 5 per minute per user
export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:ai",
});

export function getClientIdentifier(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

/**
 * Apply general rate limiting to a route.
 * Returns a 429 response if limit exceeded, otherwise null.
 */
export async function applyRateLimit(
  req: NextRequest,
  identifier: string,
  type: "general" | "ai" = "general"
): Promise<NextResponse | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // Skip rate limiting if Redis is not configured (dev mode)
    return null;
  }

  const limiter = type === "ai" ? aiLimiter : generalLimiter;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    logger.warn({ identifier, type }, "[RateLimit] Limit exceeded");
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", limit, remaining, reset },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
