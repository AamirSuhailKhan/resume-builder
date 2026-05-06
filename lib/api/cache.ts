import { redis } from "@/lib/redis";

/**
 * safeRedisCall - Wraps Redis operations to ensure infra failures never crash the app.
 * If Redis is down (e.g., Upstash ENOTFOUND), it logs and returns null, allowing the app to "fail-open".
 */
export async function safeRedisCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    if (!redis) return null;
    return await fn();
  } catch (err) {
    console.error("[REDIS INFRA ERROR] Failing open:", err);
    return null;
  }
}

export async function getCache(key: string) {
  const client = redis;
  return safeRedisCall(() => client!.get(key));
}

export async function setCache(key: string, value: unknown, ex: number = 3600) {
  const client = redis;
  return safeRedisCall(() => client!.set(key, value, { ex }));
}

export async function invalidateCache(key: string) {
  const client = redis;
  return safeRedisCall(() => client!.del(key));
}

export async function invalidateResumeCaches(userId: string, resumeId?: string) {
  await invalidateCache(`resumes:${userId}`);
  if (resumeId) {
    await invalidateCache(`resume:${resumeId}:${userId}`);
  }
}
