import { getRedisClient } from "@/lib/redis";
import {
  NormalizedProviderJob,
  ProviderResponse,
} from "../../provider.types";

export type ProviderRecord = Record<string, unknown>;

export const INDIA_CITY_PATTERN = /\b(india|bengaluru|bangalore|mumbai|delhi|new delhi|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|kochi|coimbatore|indore|remote india)\b/i;

export function isIndiaLocation(location: string | null | undefined): boolean {
  return Boolean(location && INDIA_CITY_PATTERN.test(location));
}

export function indiaLocationTags(location: string | null | undefined): string[] {
  const tags = new Set<string>();
  if (isIndiaLocation(location)) tags.add("india");
  const normalized = (location ?? "").toLowerCase();
  for (const city of ["bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "pune", "chennai"]) {
    if (normalized.includes(city)) tags.add(city === "bengaluru" ? "bangalore" : city);
  }
  return [...tags];
}

export function asRecord(value: unknown): ProviderRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ProviderRecord : {};
}

export function asArray(value: unknown): ProviderRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item) => Object.keys(item).length > 0) : [];
}

export function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

export function nullableString(value: unknown): string | null {
  const text = stringValue(value).trim();
  return text ? text : null;
}

export function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const normalized = value.replace(/,/g, "").toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  if (/\b(cr|crore)\b/.test(normalized)) return Math.round(base * 10000000);
  if (/\b(lpa|lakh|lakhs|lac|lacs)\b/.test(normalized)) return Math.round(base * 100000);
  return Math.round(base);
}

export function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\n|/]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

export function cleanText(value: unknown): string {
  return stringValue(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDate(value: unknown): Date {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  const text = stringValue(value).trim();
  if (!text) return new Date();

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const daysAgo = text.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgo?.[1]) return new Date(Date.now() - Number(daysAgo[1]) * 86_400_000);
  if (/today|just now/i.test(text)) return new Date();
  if (/yesterday/i.test(text)) return new Date(Date.now() - 86_400_000);

  return new Date();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Provider fetch failed";
}

export function buildProviderResponse(
  provider: string,
  data: NormalizedProviderJob[],
  rawCount: number,
  startedAt: number,
  error?: string
): ProviderResponse<NormalizedProviderJob> {
  return {
    ok: !error,
    data,
    provider,
    fetchedAt: new Date(),
    durationMs: Date.now() - startedAt,
    rawCount,
    normalizedCount: data.length,
    deduplicatedCount: Math.max(0, rawCount - data.length),
    ...(error ? { error } : {}),
  };
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "CareerOS-IndiaJobs/1.0 (+https://careeros.in)",
      Accept: "application/json,text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
      ...init.headers,
    },
  });
}

export async function isAllowedByRobots(targetUrl: string, userAgent = "CareerOS-IndiaJobs"): Promise<boolean> {
  try {
    const target = new URL(targetUrl);
    const robotsUrl = `${target.origin}/robots.txt`;
    const res = await fetchWithTimeout(robotsUrl, { headers: { Accept: "text/plain" } }, 5000);
    if (!res.ok) return true;

    const rules = await res.text();
    const path = target.pathname || "/";
    let applies = false;
    let allowed = true;

    for (const rawLine of rules.split(/\r?\n/)) {
      const line = rawLine.split("#")[0]?.trim();
      if (!line) continue;

      const [rawKey, ...rawValue] = line.split(":");
      const key = rawKey?.trim().toLowerCase();
      const value = rawValue.join(":").trim();

      if (key === "user-agent") {
        const agent = value.toLowerCase();
        applies = agent === "*" || userAgent.toLowerCase().includes(agent);
        continue;
      }

      if (!applies) continue;

      if (key === "allow" && value && path.startsWith(value)) {
        allowed = true;
      }
      if (key === "disallow" && value && path.startsWith(value)) {
        allowed = false;
      }
    }

    return allowed;
  } catch {
    return true;
  }
}

export async function readCachedJobs(key: string): Promise<NormalizedProviderJob[] | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const cached = await redis.get<unknown>(key);
  if (!Array.isArray(cached)) return null;

  return cached.map((item) => {
    const record = asRecord(item);
    return {
      externalId: stringValue(record.externalId),
      title: stringValue(record.title),
      company: stringValue(record.company),
      location: nullableString(record.location),
      remote: Boolean(record.remote),
      salaryMin: numberValue(record.salaryMin),
      salaryMax: numberValue(record.salaryMax),
      currency: stringValue(record.currency, "INR"),
      employmentType: nullableString(record.employmentType),
      experienceLevel: nullableString(record.experienceLevel),
      skills: stringArray(record.skills),
      source: stringValue(record.source),
      sourceUrl: stringValue(record.sourceUrl),
      postedAt: parseDate(record.postedAt),
      description: stringValue(record.description),
    };
  }).filter((job) => job.externalId && job.title && job.company && job.sourceUrl);
}

export async function writeCachedJobs(key: string, jobs: NormalizedProviderJob[], ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis || jobs.length === 0) return;

  await redis.set(key, jobs.map((job) => ({ ...job, postedAt: job.postedAt.toISOString() })), { ex: ttlSeconds });
}
