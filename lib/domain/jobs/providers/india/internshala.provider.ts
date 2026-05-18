import { logger } from "@/lib/logger";
import {
  JobProviderContract,
  NormalizedProviderJob,
  ProviderResponse,
} from "../../provider.types";
import {
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
  stringValue,
  writeCachedJobs,
} from "./utils";

type InternshalaWindow = {
  jobs?: unknown[];
  internships?: unknown[];
};

function parseWindowJobs(html: string): unknown[] {
  const scripts = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i,
    /window\.initialData\s*=\s*(\{[\s\S]*?\});/i,
  ];

  for (const pattern of scripts) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const parsed = JSON.parse(match[1]) as InternshalaWindow;
      const candidates = parsed.jobs ?? parsed.internships;
      if (Array.isArray(candidates)) return candidates;
    } catch {
      // Fall through to card parsing.
    }
  }

  return [];
}

function parseCardJobs(html: string): unknown[] {
  const cards = html.match(/<div[^>]+(?:individual_internship|internship_meta)[\s\S]*?(?=<div[^>]+(?:individual_internship|internship_meta)|<\/body>)/gi) ?? [];
  return cards.map((card, index) => {
    const titleMatch = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) ?? card.match(/class="[^"]*job-title[^"]*"[^>]*>([\s\S]*?)</i);
    const companyMatch = card.match(/class="[^"]*(?:company_name|company-name)[^"]*"[^>]*>([\s\S]*?)</i);
    const locationMatch = card.match(/class="[^"]*(?:locations?|location_link)[^"]*"[^>]*>([\s\S]*?)</i);
    const urlMatch = card.match(/href="([^"]+)"/i);
    const salaryMatch = card.match(/(?:salary|stipend)[\s\S]{0,80}?((?:₹|Rs\.?|INR)?\s*[0-9,.]+\s*(?:-\s*(?:₹|Rs\.?|INR)?\s*[0-9,.]+)?\s*(?:LPA|lakh|lakhs|month|year|annum)?)/i);

    return {
      id: `internshala-card-${index}`,
      title: cleanText(titleMatch?.[1]),
      company_name: cleanText(companyMatch?.[1]),
      location: cleanText(locationMatch?.[1]),
      url: urlMatch?.[1] ?? "",
      salary: cleanText(salaryMatch?.[1]),
      description: cleanText(card),
      posted_at: new Date().toISOString(),
    };
  }).filter((job) => job.title && job.company_name);
}

function recordValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return undefined;
}

function normalizeInternshalaJob(raw: unknown, index: number): NormalizedProviderJob | null {
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const title = cleanText(recordValue(record, ["title", "profile_name", "job_title", "designation"]));
  const company = cleanText(recordValue(record, ["company_name", "company", "employer_name"]));
  const type = stringValue(recordValue(record, ["employment_type", "type", "job_type"]), "full_time");
  const internshipSignal = `${title} ${type}`.toLowerCase();

  if (!title || !company || internshipSignal.includes("internship")) return null;

  const location = nullableString(cleanText(recordValue(record, ["location", "locations", "city"])));
  const url = stringValue(recordValue(record, ["url", "job_url", "absolute_url"]));
  const sourceUrl = url.startsWith("http") ? url : `https://internshala.com${url.startsWith("/") ? url : `/${url}`}`;
  const salaryText = stringValue(recordValue(record, ["salary", "ctc", "salary_detail"]));

  return {
    externalId: stringValue(recordValue(record, ["id", "internship_id", "job_id"]), `internshala-${index}-${title}-${company}`),
    title,
    company,
    location,
    remote: (location ?? "").toLowerCase().includes("remote"),
    salaryMin: numberValue(salaryText),
    salaryMax: null,
    currency: "INR",
    employmentType: "full_time",
    experienceLevel: nullableString(recordValue(record, ["experience", "experience_level"])),
    skills: stringArray(recordValue(record, ["skills", "tags", "skill_names"])).slice(0, 12),
    source: "internshala",
    sourceUrl,
    postedAt: parseDate(recordValue(record, ["posted_at", "posted_on", "start_date"])),
    description: cleanText(recordValue(record, ["description", "job_description", "detail"])) || `${title} at ${company}`,
  };
}

export class InternshalaProvider implements JobProviderContract {
  readonly name = "internshala";
  readonly baseUrl = "https://internshala.com";
  readonly rateLimitMs = 30 * 60 * 1000;

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout("https://internshala.com/jobs/jobs-for-freshers-in-india", {}, 5000);
      return res.ok || res.status === 429 || res.status === 503;
    } catch {
      return false;
    }
  }

  async fetchJobs(query: string, _location?: string, limit = 100): Promise<ProviderResponse<NormalizedProviderJob>> {
    const startedAt = Date.now();
    const cacheKey = `provider:internshala:${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const cached = await readCachedJobs(cacheKey);
    if (cached) return buildProviderResponse(this.name, cached.slice(0, limit), cached.length, startedAt);

    try {
      const url = "https://internshala.com/jobs/jobs-for-freshers-in-india";
      if (!(await isAllowedByRobots(url))) {
        logger.warn({ provider: this.name, url }, "[Provider] blocked by robots.txt");
        return buildProviderResponse(this.name, [], 0, startedAt);
      }

      const res = await fetchWithTimeout(url, {
        headers: { Accept: "text/html" },
      });
      if (res.status === 429 || res.status === 503) {
        logger.warn({ provider: this.name, status: res.status }, "[Provider] rate limited or unavailable");
        return buildProviderResponse(this.name, [], 0, startedAt);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      const rawJobs = parseWindowJobs(html);
      const raw = rawJobs.length > 0 ? rawJobs : parseCardJobs(html);
      const normalized = raw
        .map((job, index) => normalizeInternshalaJob(job, index))
        .filter((job): job is NormalizedProviderJob => Boolean(job))
        .slice(0, Math.min(limit, 200));

      await writeCachedJobs(cacheKey, normalized, 2 * 60 * 60);
      logger.info({ provider: this.name, count: normalized.length }, "[Provider] jobs fetched");
      return buildProviderResponse(this.name, normalized, raw.length, startedAt);
    } catch (error) {
      const message = errorMessage(error);
      logger.warn({ provider: this.name, error: message }, "[Provider] fetch failed");
      return buildProviderResponse(this.name, [], 0, startedAt, message);
    }
  }
}
