import { logger } from "@/lib/logger";
import {
  JobProviderContract,
  NormalizedProviderJob,
  ProviderResponse,
} from "./provider.types";

type ProviderRecord = Record<string, unknown>;

function asRecord(value: unknown): ProviderRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ProviderRecord : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function nullableString(value: unknown): string | null {
  const text = stringValue(value).trim();
  return text ? text : null;
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Provider fetch failed";
}

abstract class BaseJobProvider implements JobProviderContract {
  abstract readonly name: string;
  abstract readonly baseUrl: string;
  abstract readonly rateLimitMs: number;

  protected async fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "ResumeAI-JobBot/1.0" },
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.fetchWithTimeout(this.baseUrl, 5000);
      return res.ok;
    } catch {
      return false;
    }
  }

  protected buildResponse(
    data: NormalizedProviderJob[],
    rawCount: number,
    durationMs: number,
    error?: string
  ): ProviderResponse<NormalizedProviderJob> {
    return {
      ok: !error,
      data,
      provider: this.name,
      fetchedAt: new Date(),
      durationMs,
      rawCount,
      normalizedCount: data.length,
      deduplicatedCount: rawCount - data.length,
      ...(error ? { error } : {}),
    };
  }

  abstract fetchJobs(
    query: string,
    location?: string,
    limit?: number
  ): Promise<ProviderResponse<NormalizedProviderJob>>;
}

// -----------------------------------------------------------------------
// Remotive — Remote job board with free public API
// -----------------------------------------------------------------------
export class RemotiveProvider extends BaseJobProvider {
  readonly name = "Remotive";
  readonly baseUrl = "https://remotive.com";
  readonly rateLimitMs = 2000;

  async fetchJobs(
    query: string,
    _location?: string,
    limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    const start = Date.now();
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=${limit}`;

    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const json = await res.json() as { jobs?: ProviderRecord[] };
      const rawJobs = json.jobs ?? [];
      const jobs: NormalizedProviderJob[] = rawJobs.map((j) => ({
        externalId: stringValue(j.id),
        title: stringValue(j.title),
        company: stringValue(j.company_name),
        location: nullableString(j.candidate_required_location),
        remote: true,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        employmentType: nullableString(j.job_type),
        experienceLevel: null,
        skills: stringArray(j.tags),
        source: this.name,
        sourceUrl: stringValue(j.url),
        postedAt: new Date(stringValue(j.publication_date)),
        description: stringValue(j.description),
      }));

      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.error({ provider: this.name, error: message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, message);
    }
  }
}

// -----------------------------------------------------------------------
// RemoteOK — Remote-only jobs
// -----------------------------------------------------------------------
export class RemoteOKProvider extends BaseJobProvider {
  readonly name = "RemoteOK";
  readonly baseUrl = "https://remoteok.com";
  readonly rateLimitMs = 3000;

  async fetchJobs(
    query: string,
    _location?: string,
    limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    const start = Date.now();
    // RemoteOK requires a 1-sec delay between requests — we respect it
    await new Promise((r) => setTimeout(r, 1000));

    const url = `https://remoteok.com/api?tag=${encodeURIComponent(query)}`;

    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json() as ProviderRecord[];
      // RemoteOK always starts with a legal disclaimer object
      const rawJobs = json.filter((j) => j.id && j.company);
      const jobs: NormalizedProviderJob[] = rawJobs.slice(0, limit).map((j) => ({
        externalId: stringValue(j.id),
        title: stringValue(j.position),
        company: stringValue(j.company),
        location: "Remote",
        remote: true,
        salaryMin: numberValue(j.salary_min),
        salaryMax: numberValue(j.salary_max),
        currency: "USD",
        employmentType: "full_time",
        experienceLevel: null,
        skills: stringArray(j.tags),
        source: this.name,
        sourceUrl: `https://remoteok.com/remote-jobs/${stringValue(j.slug)}`,
        postedAt: new Date(stringValue(j.date)),
        description: stringValue(j.description),
      }));

      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.error({ provider: this.name, error: message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, message);
    }
  }
}

// -----------------------------------------------------------------------
// Arbeitnow — European job board with free API
// -----------------------------------------------------------------------
export class ArbeitnowProvider extends BaseJobProvider {
  readonly name = "Arbeitnow";
  readonly baseUrl = "https://arbeitnow.com";
  readonly rateLimitMs = 1000;

  async fetchJobs(
    query: string,
    location?: string,
    limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    const start = Date.now();
    const params = new URLSearchParams({ search: query });
    if (location) params.set("location", location);
    const url = `https://arbeitnow.com/api/job-board-api?${params}`;

    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json() as { data?: ProviderRecord[] };
      const rawJobs = json.data ?? [];
      const jobs: NormalizedProviderJob[] = rawJobs.slice(0, limit).map((j) => ({
        externalId: stringValue(j.slug),
        title: stringValue(j.title),
        company: stringValue(j.company_name),
        location: nullableString(j.location),
        remote: Boolean(j.remote),
        salaryMin: null,
        salaryMax: null,
        currency: "EUR",
        employmentType: Array.isArray(j.job_types) ? nullableString(j.job_types[0]) : null,
        experienceLevel: null,
        skills: stringArray(j.tags),
        source: this.name,
        sourceUrl: stringValue(j.url),
        postedAt: new Date((numberValue(j.created_at) ?? 0) * 1000),
        description: stringValue(j.description),
      }));

      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.error({ provider: this.name, error: message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, message);
    }
  }
}

// -----------------------------------------------------------------------
// Greenhouse — ATS-based job board (requires employer slug)
// -----------------------------------------------------------------------
export class GreenhouseProvider extends BaseJobProvider {
  readonly name = "Greenhouse";
  readonly baseUrl = "https://boards.greenhouse.io";
  readonly rateLimitMs = 500;

  async fetchJobs(
    _query: string,
    _location?: string,
    limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    // Greenhouse requires per-company slugs — not a generic search API.
    // Future: accept company slugs as config and fan-out to each.
    logger.warn({ provider: this.name }, "[Provider] Generic search not supported. Configure company slugs.");
    return this.buildResponse([], 0, 0, "Greenhouse requires per-company slug configuration");
  }

  /** Fetch jobs for a specific Greenhouse employer slug */
  async fetchForCompany(
    slug: string,
    limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    const start = Date.now();
    const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json() as { jobs?: ProviderRecord[] };
      const rawJobs = json.jobs ?? [];
      const jobs: NormalizedProviderJob[] = rawJobs.slice(0, limit).map((j) => {
        const location = asRecord(j.location);
        const locationName = nullableString(location.name);
        return {
        externalId: stringValue(j.id),
        title: stringValue(j.title),
        company: slug,
        location: locationName,
        remote: locationName?.toLowerCase().includes("remote") ?? false,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        employmentType: null,
        experienceLevel: null,
        skills: [],
        source: this.name,
        sourceUrl: stringValue(j.absolute_url),
        postedAt: new Date(stringValue(j.updated_at)),
        description: stringValue(j.content),
      };
      });

      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.error({ provider: this.name, slug, error: message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, message);
    }
  }
}

// -----------------------------------------------------------------------
// Lever — ATS-based job board (similar to Greenhouse, per-company)
// -----------------------------------------------------------------------
export class LeverProvider extends BaseJobProvider {
  readonly name = "Lever";
  readonly baseUrl = "https://api.lever.co";
  readonly rateLimitMs = 500;

  async fetchJobs(
    _query: string,
    _location?: string,
    _limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    logger.warn({ provider: this.name }, "[Provider] Generic search not supported. Configure company tags.");
    return this.buildResponse([], 0, 0, "Lever requires per-company tag configuration");
  }

  async fetchForCompany(
    companyTag: string,
    limit = 20
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    const start = Date.now();
    const url = `https://api.lever.co/v0/postings/${companyTag}?mode=json&limit=${limit}`;

    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawJobs = await res.json() as ProviderRecord[];
      const jobs: NormalizedProviderJob[] = rawJobs.map((j) => ({
        externalId: stringValue(j.id),
        title: stringValue(j.text),
        company: companyTag,
        location: nullableString(asRecord(j.categories).location),
        remote: nullableString(asRecord(j.categories).location)?.toLowerCase().includes("remote") ?? false,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        employmentType: nullableString(asRecord(j.categories).commitment),
        experienceLevel: nullableString(asRecord(j.categories).team),
        skills: [],
        source: this.name,
        sourceUrl: stringValue(j.hostedUrl),
        postedAt: new Date(numberValue(j.createdAt) ?? Date.now()),
        description: stringValue(j.descriptionPlain),
      }));

      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.error({ provider: this.name, companyTag, error: message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, message);
    }
  }
}
