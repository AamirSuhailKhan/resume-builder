import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

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

    if (flag && flag.rolloutPct < 100) {
      const roll = parseInt(flagKey.slice(-2), 36) % 100;
      const final = value && roll < flag.rolloutPct;
      cache.set(flagKey, { value: final, expiry: now + CACHE_TTL_MS });
      return final;
    }

    cache.set(flagKey, { value, expiry: now + CACHE_TTL_MS });
    return value;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Feature flag check failed";
    logger.error({ err: message, flagKey }, "[FeatureFlag] DB check failed; defaulting to false");
    return false;
  }
}

export function invalidateFlag(flagKey: string) {
  cache.delete(flagKey);
}

export const Flags = {
  ATS_V2_ENGINE: "ats_v2_engine",
  MEILISEARCH_ENABLED: "meilisearch_enabled",
  AI_MODEL_GEMINI_PRIMARY: "ai_model_gemini_primary",
  JOB_SYNC_ENABLED: "job_sync_enabled",
  INTERVIEW_PREP_ENABLED: "interview_prep_enabled",
  SALARY_BENCHMARK_ENABLED: "salary_benchmark_enabled",
} as const;
