import type { StorageData } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getStorage(): Promise<StorageData> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["auth_token", "user_profile", "profile_cached_at"],
      (result) => {
        resolve({
          auth_token: (result.auth_token as string) ?? null,
          user_profile: result.user_profile ?? null,
          profile_cached_at: (result.profile_cached_at as number) ?? null,
        });
      }
    );
  });
}

export async function setStorage(data: Partial<StorageData>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.clear(resolve));
}

export function isProfileStale(cachedAt: number | null): boolean {
  if (!cachedAt) return true;
  return Date.now() - cachedAt > CACHE_TTL_MS;
}
