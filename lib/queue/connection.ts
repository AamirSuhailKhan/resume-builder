import IORedis, { type RedisOptions } from "ioredis";
import { getRedisUrl as readRedisUrl } from "@/lib/env";

const globalForRedis = globalThis as unknown as {
  resumeAiQueueRedis?: IORedis;
};

export function getRedisUrl(): string {
  const url = readRedisUrl();
  if (!url) {
    throw new Error(
      "[QUEUE] REDIS_URL is not configured.\n" +
      "   Set REDIS_URL to a redis:// or rediss:// TCP connection string.\n" +
      "   Do NOT use an https:// Upstash REST URL here."
    );
  }
  return url;
}

export function getRedisUrlOptional(): string | null {
  return readRedisUrl() ?? null;
}

export function createRedisConnection(options: RedisOptions = {}): IORedis {
  const url = getRedisUrl();
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 250, 5000);
    },
    reconnectOnError(error) {
      return /READONLY|ETIMEDOUT|ECONNRESET/i.test(error.message);
    },
    ...options,
  });
}

export function getQueueRedisConnection(): IORedis {
  if (!globalForRedis.resumeAiQueueRedis) {
    globalForRedis.resumeAiQueueRedis = createRedisConnection();
  }
  return globalForRedis.resumeAiQueueRedis;
}
