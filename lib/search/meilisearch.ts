import { MeiliSearch } from "meilisearch";

const globalForMeili = globalThis as unknown as {
  meilisearch: MeiliSearch | undefined;
};

export const meilisearch =
  globalForMeili.meilisearch ??
  new MeiliSearch({
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
      filterableAttributes: ["remote", "salaryMin", "skills", "experienceLevel"],
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
    console.error("[Meilisearch] Failed to initialize indexes", error);
  }
}
