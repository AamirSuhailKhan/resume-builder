/**
 * Standardized provider response wrapper.
 * All job providers MUST return this shape.
 * Enables telemetry, circuit breaking, and graceful degradation.
 */
export interface ProviderResponse<T> {
  ok: boolean;
  data: T[];
  provider: string;
  fetchedAt: Date;
  durationMs: number;
  /** How many raw records were fetched before normalization */
  rawCount: number;
  /** How many records were successfully normalized */
  normalizedCount: number;
  /** How many were dropped as duplicates */
  deduplicatedCount: number;
  error?: string;
}

/**
 * All job providers must implement this interface.
 */
export interface JobProviderContract<T = NormalizedProviderJob> {
  readonly name: string;
  readonly baseUrl: string;
  readonly rateLimitMs: number;
  fetchJobs(query: string, location?: string, limit?: number): Promise<ProviderResponse<T>>;
  healthCheck(): Promise<boolean>;
}

export interface NormalizedProviderJob {
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  employmentType: string | null;
  experienceLevel: string | null;
  skills: string[];
  source: string;
  sourceUrl: string;
  postedAt: Date;
  description: string;
}

/**
 * Tracks provider health over time.
 */
export interface ProviderHealthRecord {
  provider: string;
  successRate: number; // 0–1
  avgDurationMs: number;
  lastCheckedAt: Date;
  isHealthy: boolean;
}
