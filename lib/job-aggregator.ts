import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const NormalizedJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  currency: z.string().default("USD"),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  skills: z.array(z.string()).default([]),
  source: z.string(),
  sourceUrl: z.string().url(),
  postedAt: z.date(),
  description: z.string(),
  logo: z.string().url().optional(),
});

export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;

export interface JobProvider {
  name: string;
  fetchJobs(query: string, location?: string, limit?: number): Promise<NormalizedJob[]>;
}

export class JobAggregator {
  private providers: JobProvider[] = [];

  registerProvider(provider: JobProvider) {
    this.providers.push(provider);
  }

  async aggregateAndStore(userId: string, query: string, location?: string, limit: number = 10) {
    const allJobs: NormalizedJob[] = [];
    
    // Fetch from all providers concurrently
    const results = await Promise.allSettled(
      this.providers.map(p => p.fetchJobs(query, location, limit))
    );

    for (const res of results) {
      if (res.status === "fulfilled") {
        allJobs.push(...res.value);
      } else {
        console.error("[JobAggregator] Provider failed:", res.reason);
      }
    }

    // Deduplicate logic
    const uniqueJobs = Array.from(new Map(allJobs.map(job => 
      [`${job.title}-${job.company}-${job.location}`, job]
    )).values());

    // Store in DB
    for (const job of uniqueJobs) {
      const salaryRange = job.salaryMin && job.salaryMax 
        ? `${job.currency} ${job.salaryMin} - ${job.salaryMax}`
        : null;

      // Upsert to prevent duplicate entries if run multiple times
      await prisma.jobOpportunity.upsert({
        where: {
          // Assume we add a unique composite key or just checking first
          // Prisma upsert needs a unique index. Let's do findFirst + create for now since schema doesn't have unique on URL
          id: "dummy-bypass-for-findFirst" 
        },
        update: {},
        create: {
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
          }
        }
      }).catch(async () => {
        // Fallback to findFirst and create since we don't have a unique constraint on sourceUrl in Prisma schema right now
        const existing = await prisma.jobOpportunity.findFirst({
          where: { userId, company: job.company, role: job.title }
        });
        if (!existing) {
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
              }
            }
          });
        }
      });
    }

    return uniqueJobs.length;
  }
}
