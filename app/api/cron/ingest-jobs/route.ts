import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CacheService } from "@/lib/cache/cache.service";
import { JobIngestionService } from "@/lib/domain/jobs/ingestion.service";
import { NormalizedProviderJob, ProviderResponse } from "@/lib/domain/jobs/provider.types";
import { ArbeitnowProvider, RemoteOKProvider, RemotiveProvider } from "@/lib/domain/jobs/providers";
import { initializeMeilisearch, JOBS_INDEX, meilisearch } from "@/lib/search/meilisearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JobDocument = Omit<NormalizedProviderJob, "postedAt"> & {
  id: string;
  title: string;
  postedAt: string;
};

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function documentId(job: NormalizedProviderJob) {
  return `${job.source}-${job.externalId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function indexJobs(jobs: NormalizedProviderJob[]) {
  if (jobs.length === 0) return;
  await initializeMeilisearch();
  const docs: JobDocument[] = jobs.map((job) => ({
    ...job,
    id: documentId(job),
    title: job.title,
    postedAt: job.postedAt.toISOString(),
  }));
  const task = await meilisearch.index<JobDocument>(JOBS_INDEX).addDocuments(docs, { primaryKey: "id" });
  await meilisearch.tasks.waitForTask(task.taskUid);
}

async function ingestForSeedUsers(responses: ProviderResponse<NormalizedProviderJob>[]) {
  const userLimit = Number(process.env.JOB_INGEST_USER_LIMIT ?? 3);
  const users = await prisma.user.findMany({
    where: { careerProfile: { isNot: null } },
    select: { id: true },
    take: Number.isFinite(userLimit) ? Math.max(0, Math.min(userLimit, 10)) : 3,
  });

  let inserted = 0;
  let skipped = 0;
  for (const user of users) {
    for (const response of responses) {
      const result = await JobIngestionService.ingestProviderResponse(user.id, response);
      inserted += result.inserted;
      skipped += result.skipped;
    }
  }
  return { users: users.length, inserted, skipped };
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) return apiError("Unauthorized cron request.", 401);

    const limit = Number(process.env.JOB_INGEST_LIMIT ?? 12);
    const queries = (process.env.JOB_INGEST_QUERIES ?? "software engineer,frontend engineer,ai engineer")
      .split(",")
      .map((query) => query.trim())
      .filter(Boolean);
    const providers = [new RemotiveProvider(), new RemoteOKProvider(), new ArbeitnowProvider()];

    const responses: ProviderResponse<NormalizedProviderJob>[] = [];
    for (const query of queries) {
      for (const provider of providers) {
        responses.push(await provider.fetchJobs(query, undefined, Number.isFinite(limit) ? limit : 12));
      }
    }

    const jobs = responses.flatMap((response) => response.data);
    await indexJobs(jobs);
    const database = await ingestForSeedUsers(responses);
    await CacheService.set("jobs:last-ingest", {
      indexed: jobs.length,
      database,
      providerRuns: responses.length,
      ingestedAt: new Date().toISOString(),
    }, 3600);

    return apiOk({
      indexed: jobs.length,
      providerRuns: responses.length,
      database,
      failures: responses.filter((response) => !response.ok).map((response) => ({
        provider: response.provider,
        error: response.error ?? "Unknown provider error",
      })),
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export const POST = GET;
