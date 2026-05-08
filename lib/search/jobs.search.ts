import { prisma } from "@/lib/db/prisma";
import { meilisearch, JOBS_INDEX } from "./meilisearch";

export interface JobSearchParams {
  query: string;
  location?: string;
  remote?: boolean;
  skills?: string[];
  limit?: number;
}

export interface RankedJobResult {
  id: string;
  company: string;
  role: string;
  description: string;
  rankingFactors: {
    atsAlignment?: number;
    semanticSimilarity?: number;
    recency?: number;
    skillCoverage?: number;
    score: number;
  };
}

export class JobsSearchService {
  
  /**
   * Fast, user-facing fuzzy search using Meilisearch.
   */
  static async searchFast(params: JobSearchParams): Promise<RankedJobResult[]> {
    const { query, location, remote, limit = 20 } = params;
    
    let filter = [];
    if (remote) filter.push("remote = true");
    if (location) filter.push(`location = '${location}'`);

    const result = await meilisearch.index(JOBS_INDEX).search(query, {
      filter: filter.length ? filter.join(" AND ") : undefined,
      limit,
    });

    return result.hits.map(hit => ({
      id: hit.id,
      company: hit.company,
      role: hit.title,
      description: hit.description,
      rankingFactors: {
        score: 1.0, // Meilisearch handles the base ranking natively
      }
    }));
  }

  /**
   * Deep, transactional filtering using Postgres Full-Text Search.
   */
  static async searchDeep(params: JobSearchParams): Promise<RankedJobResult[]> {
    const { query, limit = 20 } = params;

    // Prisma Postgres Full Text Search
    // Requires preview feature 'fullTextSearch'
    const jobs = await prisma.jobOpportunity.findMany({
      where: {
        OR: [
          { role: { search: query } },
          { description: { search: query } },
          { company: { search: query } },
        ]
      },
      take: limit,
      orderBy: {
        createdAt: "desc"
      }
    });

    return jobs.map(job => ({
      id: job.id,
      company: job.company,
      role: job.role,
      description: job.description,
      rankingFactors: {
        recency: 1.0,
        score: 1.0
      }
    }));
  }
}
