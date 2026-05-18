import { Meilisearch } from "meilisearch";
import { logger } from "@/lib/logger";

const globalForMeili = globalThis as unknown as {
  meilisearch: Meilisearch | undefined;
};

export const meilisearch =
  globalForMeili.meilisearch ??
  new Meilisearch({
    host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_KEY || "masterKey",
  });

if (process.env.NODE_ENV !== "production") {
  globalForMeili.meilisearch = meilisearch;
}

export const JOBS_INDEX = "jobs";
export const RESUMES_INDEX = "resumes";

// Initialize indexes with correct settings
export async function initializeMeilisearch() {
  try {
    const jobsIndex = meilisearch.index(JOBS_INDEX);
    await jobsIndex.updateSettings({
      searchableAttributes: ["title", "company", "description", "skills", "location"],
      filterableAttributes: ["remote", "salaryMin", "skills", "experienceLevel", "source", "isIndia", "locationTags", "postedAt"],
      sortableAttributes: ["postedAt", "salaryMax"],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness"
      ]
    });
    
    // Similarly for resumes
  } catch (error) {
    logger.error({ error }, "[Meilisearch] Failed to initialize indexes");
  }
}
