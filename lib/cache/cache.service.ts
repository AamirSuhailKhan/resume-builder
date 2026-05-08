import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

export class CacheService {
  /**
   * Get a cached value. Returns null on miss or error.
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      if (!redis) return null;
      const val = await redis.get(key);
      if (!val) return null;
      return JSON.parse(val as string) as T;
    } catch (err: any) {
      logger.warn({ key, err: err.message }, "[Cache] Get failed");
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL (seconds).
   */
  static async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err: any) {
      logger.warn({ key, err: err.message }, "[Cache] Set failed");
    }
  }

  /**
   * Invalidate one or more keys.
   */
  static async invalidate(...keys: string[]): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis || keys.length === 0) return;
      await redis.del(...keys);
    } catch (err: any) {
      logger.warn({ keys, err: err.message }, "[Cache] Invalidate failed");
    }
  }

  /**
   * Cache-aside pattern: fetch from cache, compute on miss, cache the result.
   */
  static async remember<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

// Cache key builders — centralised to avoid typos
export const CacheKeys = {
  analytics: (userId: string) => `analytics:${userId}`,
  atsResult: (resumeId: string, jobHash: string) => `ats:${resumeId}:${jobHash}`,
  jobSearch: (query: string) => `search:jobs:${encodeURIComponent(query)}`,
  providerHealth: (provider: string) => `provider:health:${provider}`,
  featureFlag: (key: string) => `flag:${key}`,
};
