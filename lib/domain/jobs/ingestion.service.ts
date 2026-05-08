import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { NormalizedProviderJob, ProviderResponse } from "./provider.types";
import { publishJobIngested, publishProviderFailed } from "@/lib/events/bus";

// Simple Levenshtein-based fuzzy check for deduplication
function areSimilar(a: string, b: string, threshold = 0.8): boolean {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return true;
  // Jaccard similarity on words
  const setA = new Set(s1.split(/\s+/));
  const setB = new Set(s2.split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 && intersection / union >= threshold;
}

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(inc|ltd|llc|corp|co|gmbh|pvt)\.?$/i, "")
    .trim();
}

export class JobIngestionService {
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

    // Load existing jobs for this user to check for duplicates
    const existing = await prisma.jobOpportunity.findMany({
      where: { userId },
      select: { company: true, role: true },
    });

    for (const job of response.data) {
      const normalizedNewCompany = normalizeCompany(job.company);

      // Fuzzy deduplicate: skip if very similar job+company exists
      const isDuplicate = existing.some(
        (e) =>
          areSimilar(normalizeCompany(e.company), normalizedNewCompany) &&
          areSimilar(e.role, job.title)
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      const salaryRange =
        job.salaryMin && job.salaryMax
          ? `${job.currency} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`
          : null;

      try {
        await prisma.jobOpportunity.create({
          data: {
            userId,
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
            },
          },
        });

        // Track for in-memory dedup within same batch
        existing.push({ company: job.company, role: job.title });
        inserted++;
        publishJobIngested(job.externalId, job.company);
      } catch (err: any) {
        logger.error(
          { provider: response.provider, job: job.title, error: err.message },
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
