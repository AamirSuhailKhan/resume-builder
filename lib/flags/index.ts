import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

/**
 * DB-backed feature flag service.
 * Checks are cached in-memory for 60 seconds to reduce DB pressure.
 */

const cache: Map<string, { value: boolean; expiry: number }> = new Map();
const CACHE_TTL_MS = 60_000;

export async function isEnabled(flagKey: string): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(flagKey);

  if (cached && cached.expiry > now) {
    return cached.value;
  }

  try {
    const flag = await prisma.featureFlag.findUnique({ where: { key: flagKey } });
    const value = flag?.enabled ?? false;

    // Apply rollout percentage if configured
    if (flag && flag.rolloutPct < 100) {
      // Deterministic hash — always same for same flag key
      const roll = parseInt(flagKey.slice(-2), 36) % 100;
      const final = value && roll < flag.rolloutPct;
      cache.set(flagKey, { value: final, expiry: now + CACHE_TTL_MS });
      return final;
    }

    cache.set(flagKey, { value, expiry: now + CACHE_TTL_MS });
    return value;
  } catch (err: any) {
    logger.error({ err: err.message, flagKey }, "[FeatureFlag] DB check failed — defaulting to false");
    return false;
  }
}

export function invalidateFlag(flagKey: string) {
  cache.delete(flagKey);
}

// Named flag keys — centralised to prevent typos
export const Flags = {
  ATS_V2_ENGINE: "ats_v2_engine",
  MEILISEARCH_ENABLED: "meilisearch_enabled",
  AI_MODEL_GEMINI_PRIMARY: "ai_model_gemini_primary",
  JOB_SYNC_ENABLED: "job_sync_enabled",
  INTERVIEW_PREP_ENABLED: "interview_prep_enabled",
  SALARY_BENCHMARK_ENABLED: "salary_benchmark_enabled",
} as const;
