import { initializeMeilisearch, JOBS_INDEX, meilisearch } from "../lib/search/meilisearch";

type SeedJob = {
  id: string;
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
  sourceUrl: string | null;
  postedAt: string;
  description: string;
};

type AdzunaJob = {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
  description?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  category?: { label?: string };
};

type AdzunaResponse = {
  results?: AdzunaJob[];
};

const DEFAULT_QUERY = "software engineer";
const DEFAULT_LOCATION = "remote";

const sampleJobs: SeedJob[] = [
  {
    id: "sample-stripe-ai-platform",
    externalId: "sample-stripe-ai-platform",
    title: "Staff Software Engineer, AI Platform",
    company: "Stripe",
    location: "Remote",
    remote: true,
    salaryMin: 250000,
    salaryMax: 370000,
    currency: "USD",
    employmentType: "full_time",
    experienceLevel: "staff",
    skills: ["TypeScript", "Python", "LLM orchestration", "Kubernetes", "PostgreSQL", "Redis"],
    source: "sample",
    sourceUrl: "https://stripe.com/jobs",
    postedAt: new Date().toISOString(),
    description:
      "Design the AI platform layer for production ML products. Own orchestration, eval infrastructure, observability, and reliable model-serving workflows for engineering teams.",
  },
  {
    id: "sample-vercel-ai-runtime",
    externalId: "sample-vercel-ai-runtime",
    title: "Principal Engineer, AI Runtime",
    company: "Vercel",
    location: "Remote",
    remote: true,
    salaryMin: 230000,
    salaryMax: 340000,
    currency: "USD",
    employmentType: "full_time",
    experienceLevel: "principal",
    skills: ["Next.js", "React", "TypeScript", "Edge runtime", "AI SDK", "Streaming"],
    source: "sample",
    sourceUrl: "https://vercel.com/careers",
    postedAt: new Date(Date.now() - 86_400_000).toISOString(),
    description:
      "Build low-latency runtime systems for AI applications, including streaming APIs, developer tooling, and production-grade deployment paths.",
  },
  {
    id: "sample-anthropic-inference",
    externalId: "sample-anthropic-inference",
    title: "Member of Technical Staff, Inference",
    company: "Anthropic",
    location: "San Francisco, CA",
    remote: false,
    salaryMin: 280000,
    salaryMax: 450000,
    currency: "USD",
    employmentType: "full_time",
    experienceLevel: "senior",
    skills: ["Python", "Distributed systems", "vLLM", "Kubernetes", "GPU optimization", "Reliability"],
    source: "sample",
    sourceUrl: "https://www.anthropic.com/careers",
    postedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    description:
      "Scale inference infrastructure for frontier models with an emphasis on latency, reliability, cost efficiency, and safe operational practices.",
  },
  {
    id: "sample-linear-product-engineer",
    externalId: "sample-linear-product-engineer",
    title: "Senior Product Engineer, AI Features",
    company: "Linear",
    location: "Remote",
    remote: true,
    salaryMin: 190000,
    salaryMax: 280000,
    currency: "USD",
    employmentType: "full_time",
    experienceLevel: "senior",
    skills: ["React", "TypeScript", "Product engineering", "LLM APIs", "PostgreSQL", "Design systems"],
    source: "sample",
    sourceUrl: "https://linear.app/careers",
    postedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    description:
      "Ship AI-assisted product workflows for issue triage, smart summaries, and knowledge retrieval in a polished product engineering environment.",
  },
];

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function inferSkills(job: AdzunaJob): string[] {
  const blob = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();
  const known = [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "PostgreSQL",
    "Redis",
    "Kubernetes",
    "AWS",
    "Machine Learning",
    "LLM",
    "Data Engineering",
  ];
  return known.filter((skill) => blob.includes(skill.toLowerCase()));
}

function normalizeAdzunaJob(job: AdzunaJob): SeedJob {
  const externalId = text(job.id, `${job.company?.display_name ?? "company"}-${job.title ?? "role"}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const location = text(job.location?.display_name, DEFAULT_LOCATION);
  return {
    id: `adzuna-${externalId}`,
    externalId,
    title: text(job.title, "Software Engineer"),
    company: text(job.company?.display_name, "Unknown company"),
    location,
    remote: location.toLowerCase().includes("remote"),
    salaryMin: typeof job.salary_min === "number" ? job.salary_min : null,
    salaryMax: typeof job.salary_max === "number" ? job.salary_max : null,
    currency: "USD",
    employmentType: text(job.contract_time, "full_time"),
    experienceLevel: optionalText(job.category?.label),
    skills: inferSkills(job),
    source: "Adzuna",
    sourceUrl: optionalText(job.redirect_url),
    postedAt: new Date(text(job.created, new Date().toISOString())).toISOString(),
    description: text(job.description, "No description provided."),
  };
}

async function fetchAdzunaJobs(): Promise<SeedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const country = process.env.ADZUNA_COUNTRY || "us";
  const query = process.env.JOB_SEED_QUERY || DEFAULT_QUERY;
  const location = process.env.JOB_SEED_LOCATION || DEFAULT_LOCATION;
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where: location,
    results_per_page: process.env.JOB_SEED_LIMIT || "50",
    "content-type": "application/json",
  });

  const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
  if (!response.ok) {
    throw new Error(`Adzuna request failed with ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as AdzunaResponse;
  return (payload.results ?? []).map(normalizeAdzunaJob);
}

async function main() {
  await initializeMeilisearch();

  const jobs = await fetchAdzunaJobs().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown Adzuna error";
    console.warn(`[seed-jobs] ${message}. Falling back to sample jobs.`);
    return [];
  });

  const documents = jobs.length > 0 ? jobs : sampleJobs;
  if (jobs.length === 0) {
    console.info("[seed-jobs] ADZUNA_APP_ID/ADZUNA_APP_KEY not found; using realistic sample jobs.");
  }

  const index = meilisearch.index<SeedJob>(JOBS_INDEX);
  const task = await index.addDocuments(documents, { primaryKey: "id" });
  await meilisearch.tasks.waitForTask(task.taskUid);

  console.info(`[seed-jobs] Indexed ${documents.length} jobs into '${JOBS_INDEX}'.`);
}

main().catch((error: unknown) => {
  console.error("[seed-jobs] Failed to seed jobs", error);
  process.exit(1);
});
