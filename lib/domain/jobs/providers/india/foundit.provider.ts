import { logger } from "@/lib/logger";
import {
  JobProviderContract,
  NormalizedProviderJob,
  ProviderResponse,
} from "../../provider.types";
import {
  asArray,
  asRecord,
  buildProviderResponse,
  cleanText,
  errorMessage,
  fetchWithTimeout,
  isAllowedByRobots,
  nullableString,
  numberValue,
  parseDate,
  readCachedJobs,
  stringArray,
  writeCachedJobs,
} from "./utils";

function firstText(values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function normalizeFounditJob(raw: unknown, index: number): NormalizedProviderJob | null {
  const job = asRecord(raw);
  const title = firstText([job.jobTitle, job.title, job.designation]);
  const company = firstText([job.companyName, job.company, job.company_name]);
  if (!title || !company) return null;

  const location = nullableString(firstText([job.location, job.locations, asRecord(job.primaryLocation).name]));
  const url = firstText([job.url, job.jobUrl, job.redirectUrl, job.applyUrl]);
  const sourceUrl = url.startsWith("http") ? url : `https://www.foundit.in${url.startsWith("/") ? url : `/${url}`}`;
  const salaryText = firstText([job.salary, job.salaryRange, job.annualSalary]);
  const salaryMin = numberValue(asRecord(job.salary).min ?? asRecord(job.salaryRange).min) ?? numberValue(salaryText);
  const salaryMax = numberValue(asRecord(job.salary).max ?? asRecord(job.salaryRange).max);
  const description = cleanText(job.description ?? job.jobDescription ?? job.summary) || `${title} at ${company}`;

  return {
    externalId: firstText([job.id, job.jobId, job.job_id]) || `foundit-${index}-${title}-${company}`,
    title,
    company,
    location,
    remote: `${location ?? ""} ${description}`.toLowerCase().includes("remote"),
    salaryMin,
    salaryMax,
    currency: "INR",
    employmentType: nullableString(firstText([job.employmentType, job.jobType])) ?? "full_time",
    experienceLevel: nullableString(firstText([job.experience, job.experienceLevel])),
    skills: stringArray(job.skills ?? job.keySkills ?? job.tags).slice(0, 12),
    source: "foundit",
    sourceUrl,
    postedAt: parseDate(job.postedDate ?? job.postedAt ?? job.createdAt),
    description,
  };
}

function extractRawJobs(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const candidates = [
    root.jobs,
    root.data,
    root.results,
    root.jobResults,
    asRecord(root.data).jobs,
    asRecord(root.data).results,
  ];

  for (const candidate of candidates) {
    const records = asArray(candidate);
    if (records.length > 0) return records;
  }

  return [];
}

export class FounditProvider implements JobProviderContract {
  readonly name = "foundit";
  readonly baseUrl = "https://www.foundit.in";
  readonly rateLimitMs = 30 * 60 * 1000;

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout("https://www.foundit.in", {}, 5000);
      return res.ok || res.status === 429 || res.status === 503;
    } catch {
      return false;
    }
  }

  async fetchJobs(query: string, location = "India", limit = 100): Promise<ProviderResponse<NormalizedProviderJob>> {
    const startedAt = Date.now();
    const normalizedQuery = query.trim() || "software engineer";
    const cacheKey = `provider:foundit:${normalizedQuery.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${location.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const cached = await readCachedJobs(cacheKey);
    if (cached) return buildProviderResponse(this.name, cached.slice(0, limit), cached.length, startedAt);

    const params = new URLSearchParams({
      limit: String(Math.min(limit, 100)),
      query: normalizedQuery,
      location,
    });
    const url = `https://www.foundit.in/middleware/jobsearch?${params}`;

    try {
      if (!(await isAllowedByRobots(url))) {
        logger.warn({ provider: this.name, url }, "[Provider] blocked by robots.txt");
        return buildProviderResponse(this.name, [], 0, startedAt);
      }
      const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
      if (res.status === 429 || res.status === 503) {
        logger.warn({ provider: this.name, status: res.status }, "[Provider] rate limited or unavailable");
        return buildProviderResponse(this.name, [], 0, startedAt);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = extractRawJobs(await res.json());
      const jobs = raw
        .map((job, index) => normalizeFounditJob(job, index))
        .filter((job): job is NormalizedProviderJob => Boolean(job))
        .slice(0, Math.min(limit, 200));

      await writeCachedJobs(cacheKey, jobs, 2 * 60 * 60);
      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return buildProviderResponse(this.name, jobs, raw.length, startedAt);
    } catch (error) {
      const message = errorMessage(error);
      logger.warn({ provider: this.name, error: message }, "[Provider] fetch failed");
      return buildProviderResponse(this.name, [], 0, startedAt, message);
    }
  }
}
