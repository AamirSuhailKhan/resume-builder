import { prisma } from "@/lib/db/prisma";
import { CanonicalJob, JobOpportunity } from "@prisma/client";
import crypto from "crypto";

export interface NormalizedProviderJob {
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  employmentType?: string;
  source: string;
  sourceUrl: string;
  externalId?: string;
  description: string;
  postedAt?: Date;
}

export class JobDeduplicator {
  /**
   * Generates a stable hash for the exact normalized signature of a job
   */
  private static generateHash(company: string, title: string, location?: string): string {
    const data = `${this.normalizeCompany(company)}|${this.normalizeTitle(title)}|${this.normalizeLocation(location || "")}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  public static normalizeCompany(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+(inc|ltd|llc|corp|co|gmbh|pvt)\.?$/i, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  public static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\(.*?\)/g, "") // remove anything in parentheses
      .replace(/\[.*?\]/g, "") // remove brackets
      .replace(/\b(remote|hybrid|onsite|wfh)\b/g, "") // remove work styles
      .replace(/[^a-z0-9\s]/g, " ") // replace special chars with space
      .replace(/\s+/g, " ") // collapse spaces
      .trim();
  }

  public static normalizeLocation(location: string): string {
    return location
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Jaccard similarity for trigrams
   */
  public static trigramSimilarity(s1: string, s2: string): number {
    const getTrigrams = (str: string) => {
      const trigrams = new Set<string>();
      for (let i = 0; i < str.length - 2; i++) {
        trigrams.add(str.slice(i, i + 3));
      }
      return trigrams;
    };
    const t1 = getTrigrams(s1);
    const t2 = getTrigrams(s2);

    if (t1.size === 0 && t2.size === 0) return 1;

    let intersection = 0;
    t1.forEach((t) => {
      if (t2.has(t)) intersection++;
    });

    const union = t1.size + t2.size - intersection;
    return intersection / union;
  }

  /**
   * Jaccard similarity for token overlap
   */
  public static tokenOverlap(s1: string, s2: string): number {
    const setA = new Set(s1.split(/\s+/));
    const setB = new Set(s2.split(/\s+/));
    
    let intersection = 0;
    setA.forEach((t) => {
      if (setB.has(t)) intersection++;
    });

    const union = new Set([...setA, ...setB]).size;
    if (union === 0) return 1;
    return intersection / union;
  }

  /**
   * Process a single provider job through the 3-layer deduplication pipeline
   */
  public static async processJob(job: NormalizedProviderJob): Promise<CanonicalJob> {
    const normCompany = this.normalizeCompany(job.company);
    const normTitle = this.normalizeTitle(job.title);
    const normLocation = this.normalizeLocation(job.location || "");
    const hash = this.generateHash(job.company, job.title, job.location);

    // Layer 1: Exact Match (Hash or Exact URL)
    const exactMatch = await prisma.canonicalJob.findFirst({
      where: {
        OR: [
          { canonicalHash: hash },
        ]
      },
    });

    if (exactMatch) {
      return this.updateCanonicalJob(exactMatch, job, 1.0, "exact_hash", { reason: "Matching canonical hash" });
    }

    // Layer 2: Normalized Match
    const companyCandidates = await prisma.canonicalJob.findMany({
      where: {
        normalizedCompany: normCompany,
      },
      orderBy: { lastSeenAt: "desc" },
      take: 50, // bounding for performance
    });

    for (const candidate of companyCandidates) {
      // Very strict normalization check
      if (candidate.normalizedTitle === normTitle && candidate.normalizedLocation === normLocation) {
        return this.updateCanonicalJob(candidate, job, 0.95, "normalized_match", {
          titleSimilarity: 1.0,
          locationSimilarity: 1.0,
        });
      }
    }

    // Layer 3: Semantic Similarity
    for (const candidate of companyCandidates) {
      const titleSim = this.trigramSimilarity(candidate.normalizedTitle, normTitle);
      const tokenSim = this.tokenOverlap(candidate.normalizedTitle, normTitle);
      
      const combinedTitleSim = (titleSim + tokenSim) / 2;

      let locationSim = 1.0;
      if (candidate.normalizedLocation && normLocation) {
        locationSim = this.tokenOverlap(candidate.normalizedLocation, normLocation);
      }

      // Threshold-based merging (Conservative, prefer false negatives)
      if (combinedTitleSim > 0.85 && locationSim > 0.7) {
        return this.updateCanonicalJob(candidate, job, combinedTitleSim, "semantic_overlap", {
          titleSimilarity: combinedTitleSim,
          locationSimilarity: locationSim,
          trigram_title: titleSim,
          token_title: tokenSim,
        });
      }
    }

    // No match found - create new CanonicalJob
    return prisma.canonicalJob.create({
      data: {
        canonicalHash: hash,
        normalizedTitle: normTitle,
        normalizedCompany: normCompany,
        normalizedLocation: normLocation || null,
        primarySource: job.source,
        sourceCount: 1,
        confidenceScore: 0.5, // Initial confidence
        mergeConfidence: null,
        mergeStrategy: "new_canonical",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }
    });
  }

  private static async updateCanonicalJob(
    canonicalJob: CanonicalJob,
    newJob: NormalizedProviderJob,
    mergeConfidence: number,
    mergeStrategy: string,
    mergeMetadata: any
  ): Promise<CanonicalJob> {
    // Increase source count, update last seen, boost confidence
    const newConfidence = Math.min((canonicalJob.confidenceScore || 0.5) + 0.15, 1.0);
    const newCount = canonicalJob.sourceCount + 1;

    return prisma.canonicalJob.update({
      where: { id: canonicalJob.id },
      data: {
        sourceCount: newCount,
        confidenceScore: newConfidence,
        lastSeenAt: new Date(),
        mergeConfidence,
        mergeStrategy,
        mergeMetadata,
      }
    });
  }
}
