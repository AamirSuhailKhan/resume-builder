import { CacheKeys, CacheService } from "@/lib/cache/cache.service";

const COACH_PROMPT_TTL_SECONDS = 3600;

export async function getCachedCoachPrompt(userId: string): Promise<string | null> {
  return CacheService.get<string>(CacheKeys.coachPrompt(userId));
}

export async function setCachedCoachPrompt(userId: string, prompt: string): Promise<void> {
  await CacheService.set(CacheKeys.coachPrompt(userId), prompt, COACH_PROMPT_TTL_SECONDS);
}

export async function invalidateCoachPrompt(userId: string): Promise<void> {
  await CacheService.invalidate(CacheKeys.coachPrompt(userId));
}
