import { logger } from "@/lib/logger";
import {
  JobProviderContract,
  NormalizedProviderJob,
  ProviderResponse,
} from "./provider.types";

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
      error,
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

      const json = await res.json();
      const jobs: NormalizedProviderJob[] = (json.jobs ?? []).map((j: any) => ({
        externalId: String(j.id),
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || null,
        remote: true,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        employmentType: j.job_type || null,
        experienceLevel: null,
        skills: (j.tags ?? []),
        source: this.name,
        sourceUrl: j.url,
        postedAt: new Date(j.publication_date),
        description: j.description,
      }));

      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return this.buildResponse(jobs, json.jobs?.length ?? 0, Date.now() - start);
    } catch (error: any) {
      logger.error({ provider: this.name, error: error.message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, error.message);
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

      const json: any[] = await res.json();
      // RemoteOK always starts with a legal disclaimer object
      const rawJobs = json.filter((j) => j.id && j.company);
      const jobs: NormalizedProviderJob[] = rawJobs.slice(0, limit).map((j) => ({
        externalId: String(j.id),
        title: j.position,
        company: j.company,
        location: "Remote",
        remote: true,
        salaryMin: j.salary_min ? Number(j.salary_min) : null,
        salaryMax: j.salary_max ? Number(j.salary_max) : null,
        currency: "USD",
        employmentType: "full_time",
        experienceLevel: null,
        skills: (j.tags ?? []),
        source: this.name,
        sourceUrl: `https://remoteok.com/remote-jobs/${j.slug}`,
        postedAt: new Date(j.date),
        description: j.description || "",
      }));

      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: any) {
      logger.error({ provider: this.name, error: error.message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, error.message);
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

      const json = await res.json();
      const rawJobs = json.data ?? [];
      const jobs: NormalizedProviderJob[] = rawJobs.slice(0, limit).map((j: any) => ({
        externalId: j.slug,
        title: j.title,
        company: j.company_name,
        location: j.location || null,
        remote: j.remote,
        salaryMin: null,
        salaryMax: null,
        currency: "EUR",
        employmentType: j.job_types?.[0] || null,
        experienceLevel: null,
        skills: j.tags ?? [],
        source: this.name,
        sourceUrl: j.url,
        postedAt: new Date(j.created_at * 1000),
        description: j.description,
      }));

      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: any) {
      logger.error({ provider: this.name, error: error.message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, error.message);
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

      const json = await res.json();
      const rawJobs = json.jobs ?? [];
      const jobs: NormalizedProviderJob[] = rawJobs.slice(0, limit).map((j: any) => ({
        externalId: String(j.id),
        title: j.title,
        company: slug,
        location: j.location?.name || null,
        remote: j.location?.name?.toLowerCase().includes("remote") ?? false,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        employmentType: null,
        experienceLevel: null,
        skills: [],
        source: this.name,
        sourceUrl: j.absolute_url,
        postedAt: new Date(j.updated_at),
        description: j.content || "",
      }));

      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: any) {
      logger.error({ provider: this.name, slug, error: error.message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, error.message);
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

      const rawJobs: any[] = await res.json();
      const jobs: NormalizedProviderJob[] = rawJobs.map((j) => ({
        externalId: j.id,
        title: j.text,
        company: companyTag,
        location: j.categories?.location || null,
        remote: j.categories?.location?.toLowerCase().includes("remote") ?? false,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        employmentType: j.categories?.commitment || null,
        experienceLevel: j.categories?.team || null,
        skills: [],
        source: this.name,
        sourceUrl: j.hostedUrl,
        postedAt: new Date(j.createdAt),
        description: j.descriptionPlain || "",
      }));

      return this.buildResponse(jobs, rawJobs.length, Date.now() - start);
    } catch (error: any) {
      logger.error({ provider: this.name, companyTag, error: error.message }, "[Provider] fetch failed");
      return this.buildResponse([], 0, Date.now() - start, error.message);
    }
  }
}
