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
  stringValue,
  writeCachedJobs,
} from "./utils";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstText(values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function placeholderValue(placeholders: unknown, keys: string[]): string {
  for (const item of asArray(placeholders)) {
    const label = stringValue(item.label ?? item.type ?? item.key).toLowerCase();
    if (keys.some((key) => label.includes(key))) return cleanText(item.value ?? item.text);
  }
  return "";
}

function normalizeNaukriJob(raw: unknown, index: number): NormalizedProviderJob | null {
  const job = asRecord(raw);
  const title = firstText([job.title, job.jobTitle, job.designation]);
  const company = firstText([job.companyName, job.company, job.company_name]);
  if (!title || !company) return null;

  const location = nullableString(firstText([
    job.location,
    placeholderValue(job.placeholders, ["location"]),
  ]));
  const url = firstText([job.jdURL, job.jobUrl, job.staticUrl, job.url]);
  const sourceUrl = url.startsWith("http") ? url : `https://www.naukri.com${url.startsWith("/") ? url : `/${url}`}`;
  const salaryText = firstText([job.salary, placeholderValue(job.placeholders, ["salary"])]);
  const experienceText = firstText([job.experience, placeholderValue(job.placeholders, ["experience", "exp"])]);
  const description = cleanText(job.jobDescription ?? job.description ?? job.jobDetails) || `${title} at ${company}`;

  return {
    externalId: firstText([job.jobId, job.job_id, job.id, job.naukriJobId]) || `naukri-${index}-${title}-${company}`,
    title,
    company,
    location,
    remote: `${location ?? ""} ${description}`.toLowerCase().includes("remote"),
    salaryMin: numberValue(salaryText),
    salaryMax: null,
    currency: "INR",
    employmentType: "full_time",
    experienceLevel: nullableString(experienceText),
    skills: stringArray(job.tagsAndSkills ?? job.keySkills ?? job.skills).slice(0, 12),
    source: "naukri",
    sourceUrl,
    postedAt: parseDate(job.createdDate ?? job.postedDate ?? job.footerPlaceholderLabel),
    description,
  };
}

function parseRss(xml: string): unknown[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item, index) => ({
    id: `naukri-rss-${index}`,
    title: cleanText(item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ?? item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]),
    companyName: cleanText(item.match(/<company><!\[CDATA\[([\s\S]*?)\]\]><\/company>/i)?.[1]),
    location: cleanText(item.match(/<location><!\[CDATA\[([\s\S]*?)\]\]><\/location>/i)?.[1]),
    jdURL: cleanText(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]),
    postedDate: cleanText(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]),
    jobDescription: cleanText(item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1]),
  }));
}

export class NaukriProvider implements JobProviderContract {
  readonly name = "naukri";
  readonly baseUrl = "https://www.naukri.com";
  readonly rateLimitMs = 30 * 60 * 1000;

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout("https://www.naukri.com/rss/jobs", {}, 5000);
      return res.ok || res.status === 429 || res.status === 503;
    } catch {
      return false;
    }
  }

  async fetchJobs(query: string, location = "india", limit = 100): Promise<ProviderResponse<NormalizedProviderJob>> {
    const startedAt = Date.now();
    const normalizedQuery = query.trim() || "software engineer";
    const cacheKey = `provider:naukri:${normalizedQuery.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${location.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const cached = await readCachedJobs(cacheKey);
    if (cached) return buildProviderResponse(this.name, cached.slice(0, limit), cached.length, startedAt);

    await delay(2000);
    const params = new URLSearchParams({
      noOfResults: String(Math.min(limit, 100)),
      urlType: "search_by_keyword",
      keyword: normalizedQuery,
      location,
      pageNo: "1",
    });
    const url = `https://www.naukri.com/jobapi/v3/search?${params}`;

    try {
      let raw: unknown[] = [];
      if (!(await isAllowedByRobots(url))) {
        logger.warn({ provider: this.name, url }, "[Provider] blocked by robots.txt");
        return buildProviderResponse(this.name, [], 0, startedAt);
      }
      const res = await fetchWithTimeout(url, {
        headers: {
          Accept: "application/json",
          Appid: "109",
          Systemid: "109",
        },
      });

      if (res.status === 429 || res.status === 503) {
        logger.warn({ provider: this.name, status: res.status }, "[Provider] rate limited or unavailable");
        return buildProviderResponse(this.name, [], 0, startedAt);
      }

      if (res.ok) {
        const json = asRecord(await res.json());
        raw = asArray(json.jobs ?? json.jobDetails ?? json.list);
      }

      if (raw.length === 0) {
        const rssUrl = "https://www.naukri.com/rss/jobs";
        if (!(await isAllowedByRobots(rssUrl))) {
          logger.warn({ provider: this.name, url: rssUrl }, "[Provider] RSS blocked by robots.txt");
          return buildProviderResponse(this.name, [], 0, startedAt);
        }
        const rss = await fetchWithTimeout(rssUrl, {
          headers: { Accept: "application/xml,text/xml" },
        });
        if (rss.status === 429 || rss.status === 503) {
          logger.warn({ provider: this.name, status: rss.status }, "[Provider] RSS rate limited or unavailable");
          return buildProviderResponse(this.name, [], 0, startedAt);
        }
        if (!rss.ok) throw new Error(`HTTP ${rss.status}`);
        raw = parseRss(await rss.text());
      }

      const jobs = raw
        .map((job, index) => normalizeNaukriJob(job, index))
        .filter((job): job is NormalizedProviderJob => Boolean(job))
        .slice(0, Math.min(limit, 200));

      await writeCachedJobs(cacheKey, jobs, 3 * 60 * 60);
      logger.info({ provider: this.name, count: jobs.length }, "[Provider] jobs fetched");
      return buildProviderResponse(this.name, jobs, raw.length, startedAt);
    } catch (error) {
      const message = errorMessage(error);
      logger.warn({ provider: this.name, error: message }, "[Provider] fetch failed");
      return buildProviderResponse(this.name, [], 0, startedAt, message);
    }
  }
}
