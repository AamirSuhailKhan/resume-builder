import IORedis, { RedisOptions } from "ioredis";
import { getRedisUrl as readRedisUrl } from "@/lib/env";

const globalForRedis = globalThis as unknown as {
  resumeAiQueueRedis?: IORedis;
};

export function getRedisUrl() {
  const url = readRedisUrl();
  if (!url) {
    throw new Error("[QUEUE] REDIS_URL is not configured.");
  }
  return url;
}

export function createRedisConnection(options: RedisOptions = {}) {
  return new IORedis(getRedisUrl(), {
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

export function getQueueRedisConnection() {
  if (!globalForRedis.resumeAiQueueRedis) {
    globalForRedis.resumeAiQueueRedis = createRedisConnection();
  }

  return globalForRedis.resumeAiQueueRedis;
}
