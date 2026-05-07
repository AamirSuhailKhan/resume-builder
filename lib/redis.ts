import { Redis } from "@upstash/redis";

// Upstash HTTP REST client — for rate limiting ONLY.
// NOT compatible with ioredis/BullMQ. Do not use for queues.
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn("[REDIS] Upstash not configured. Rate limiting DISABLED.");
}
