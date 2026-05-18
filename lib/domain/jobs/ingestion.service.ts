import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";
import { NormalizedProviderJob, ProviderResponse, JobProviderContract } from "./provider.types";
import { publishJobIngested, publishProviderFailed } from "@/lib/events/bus";
import { GhostJobDetector } from "@/lib/job-intelligence/ghost-detector";
import { ScamJobDetector } from "@/lib/job-intelligence/scam-detector";
import { ArbeitnowProvider, RemoteOKProvider, RemotiveProvider } from "./providers";
import { FounditProvider, InternshalaProvider, NaukriProvider, indiaLocationTags, isIndiaLocation } from "./providers/india";

import { JobDeduplicator } from "./deduplicator.service";

export const DEFAULT_JOB_PROVIDERS: JobProviderContract[] = [
  new RemotiveProvider(),
  new RemoteOKProvider(),
  new ArbeitnowProvider(),
  new InternshalaProvider(),
  new NaukriProvider(),
  new FounditProvider(),
];

function emptyProviderResponse(
  provider: string,
  durationMs: number,
  error?: string
): ProviderResponse<NormalizedProviderJob> {
  return {
    ok: !error,
    data: [],
    provider,
    fetchedAt: new Date(),
    durationMs,
    rawCount: 0,
    normalizedCount: 0,
    deduplicatedCount: 0,
    ...(error ? { error } : {}),
  };
}

function providerRateKey(provider: string, query: string, location?: string) {
  return `provider:rate:${provider.toLowerCase()}:${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${(location ?? "any").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export class JobIngestionService {
  static async fetchProviderJobs(
    provider: JobProviderContract,
    query: string,
    location?: string,
    limit = 100
  ): Promise<ProviderResponse<NormalizedProviderJob>> {
    const startedAt = Date.now();
    const redis = getRedisClient();
    const key = providerRateKey(provider.name, query, location);

    if (redis) {
      const recentlyFetched = await redis.get<string>(key);
      if (recentlyFetched) {
        logger.info({ provider: provider.name, query, location }, "[Provider] fetch skipped by rate limit");
        return emptyProviderResponse(provider.name, Date.now() - startedAt);
      }
      await redis.set(key, new Date().toISOString(), { ex: 30 * 60 });
    }

    try {
      return await provider.fetchJobs(query, location, Math.min(limit, 200));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider fetch failed";
      logger.warn({ provider: provider.name, error: message }, "[Provider] isolated failure");
      return emptyProviderResponse(provider.name, Date.now() - startedAt, message);
    }
  }

  static async ingestProviderResponse(
    userId: string,
    response: ProviderResponse<NormalizedProviderJob>
  ): Promise<{ inserted: number; skipped: number }> {
    if (!response.ok || response.data.length === 0) {
      if (response.error) {
        publishProviderFailed(response.provider, response.error);
      }
      return { inserted: 0, skipped: 0 };
    }

    let inserted = 0;
    let skipped = 0;

    // Track canonical IDs to prevent duplicate inserts in the same batch
    const batchCanonicalIds = new Set<string>();

    for (const job of response.data) {
      try {
        // Step 1: Global Deduplication (Canonical Job)
        const canonical = await JobDeduplicator.processJob({
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          employmentType: job.employmentType,
          source: job.source,
          sourceUrl: job.sourceUrl,
          externalId: job.externalId,
          description: job.description,
          postedAt: job.postedAt,
        });

        if (batchCanonicalIds.has(canonical.id)) {
          skipped++;
          continue;
        }

        // Step 2: User-Level Deduplication
        const existingOpp = await prisma.jobOpportunity.findFirst({
          where: { userId, canonicalJobId: canonical.id },
          select: { id: true },
        });

        if (existingOpp) {
          skipped++;
          continue;
        }

        batchCanonicalIds.add(canonical.id);

        const salaryRange =
          job.salaryMin && job.salaryMax
            ? `${job.currency} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`
            : null;

        const india = isIndiaLocation(job.location);
        const locationTags = indiaLocationTags(job.location);

        const newJob = await prisma.jobOpportunity.create({
          data: {
            userId,
            canonicalJobId: canonical.id,
            company: job.company,
            role: job.title,
            location: job.location,
            salaryRange,
            description: job.description,
            sourceUrl: job.sourceUrl,
            sourceType: "verified",
            parsed: {
              skills: job.skills,
              remote: job.remote,
              employmentType: job.employmentType,
              experienceLevel: job.experienceLevel,
              externalId: job.externalId,
              postedAt: job.postedAt,
              source: job.source,
              isIndia: india,
              locationTags,
            },
          },
        });

        // Run ghost detection
        try {
          const detector = new GhostJobDetector();
          const { score, signals, verdict } = await detector.score(newJob);
          
          await prisma.jobOpportunity.update({
            where: { id: newJob.id },
            data: {
              ghostScore: score,
              ghostSignals: { signals, verdict, detectedAt: new Date().toISOString() },
              lastVerifiedAt: new Date(),
            },
          });
        } catch (err) {
          logger.warn({ err, jobId: newJob.id }, "[Ingestion] Failed to run ghost job detection");
        }

        // Run scam detection
        try {
          const scamDetector = new ScamJobDetector();
          const scamResult = await scamDetector.detectScam({
            title: job.title,
            company: job.company,
            url: job.sourceUrl,
            description: job.description,
            salaryRange,
            scamReports: 0,
          });

          await prisma.jobOpportunity.update({
            where: { id: newJob.id },
            data: {
              scamScore: scamResult.score,
              scamVerdict: scamResult.verdict,
              scamSignals: { signals: scamResult.signals, detectedAt: new Date().toISOString() },
            },
          });
        } catch (err) {
          logger.warn({ err, jobId: newJob.id }, "[Ingestion] Failed to run scam job detection");
        }

        inserted++;
        publishJobIngested(job.externalId, job.company);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to insert job";
        logger.error(
          { provider: response.provider, job: job.title, error: message },
          "[Ingestion] Failed to insert job"
        );
      }
    }

    logger.info(
      { provider: response.provider, inserted, skipped },
      "[Ingestion] Batch complete"
    );

    return { inserted, skipped };
  }
}
