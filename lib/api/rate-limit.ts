import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * apiLimiter - General purpose API rate limiting (100 req / 10s)
 */
export const apiLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit/api",
}) : null;

/**
 * queueLimiter - Strict background task limiting (5 req / 1 min)
 */
export const queueLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/queue",
}) : null;

/**
 * rateLimitSafe - Wraps the rate limiter to ensure it never blocks if Redis is unreachable.
 * If Redis fails, we assume "success" to keep the app operational.
 */
export async function rateLimitSafe(limiter: Ratelimit | null, key: string) {
  try {
    if (!limiter) {
      return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() };
    }
    const result = await limiter.limit(key);
    return result;
  } catch (err) {
    console.error("[RATE LIMIT INFRA ERROR] Redis unreachable, bypassing limit:", err);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    };
  }
}

/**
 * checkCircuitBreaker - Simple health check for downstream services stored in Redis.
 */
export async function checkCircuitBreaker(serviceName: string): Promise<boolean> {
  try {
    if (!redis) return true;
    const isBroken = await redis.get(`circuit:${serviceName}`);
    return !isBroken;
  } catch {
    return true; // Fail healthy if Redis is down
  }
}

export async function recordServiceFailure(serviceName: string) {
  try {
    if (!redis) return;
    await redis.set(`circuit:${serviceName}`, "open", { ex: 60 });
  } catch (err) {
    console.error("[CIRCUIT BREAKER ERROR] Failed to record service failure:", err);
  }
}

export async function resetCircuitBreaker(serviceName: string) {
  try {
    if (!redis) return;
    await redis.del(`circuit:${serviceName}`);
  } catch (err) {
    console.error("[CIRCUIT BREAKER ERROR] Failed to reset service health:", err);
  }
}
