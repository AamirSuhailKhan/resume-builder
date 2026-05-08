import { JobProvider, NormalizedJob } from "../job-aggregator";

export class LinkedInProvider implements JobProvider {
  name = "LinkedIn";

  async fetchJobs(query: string, location?: string, limit: number = 10): Promise<NormalizedJob[]> {
    console.info(`[LinkedInProvider] Fetching jobs for query: ${query}, location: ${location}, limit: ${limit}`);
    
    // In a real production system, this would use LinkedIn API or an Apify scraper
    // For now, we simulate fetching with the proper interface.
    // Replace this logic with actual fetch logic when API keys are available.

    const mockedJobs: NormalizedJob[] = [];
    
    // Simulate delay
    await new Promise(res => setTimeout(res, 500));

    return mockedJobs;
  }
}
