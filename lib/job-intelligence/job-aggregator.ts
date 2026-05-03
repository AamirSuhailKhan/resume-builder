/**
 * ─── Module 2: Job Aggregator ─────────────────────────────────────────────────
 *
 * Responsibilities:
 *  1. Persist ParsedJob records to a server-side store.
 *  2. Expose a way to retrieve all AggregatedJob records for analytics.
 *
 * Storage Strategy:
 *  - Primary: in-process Map (reset on server restart, perfect for dev).
 *  - The interface is intentionally abstracted behind `JobRepository` so
 *    swapping to Supabase/Postgres requires only replacing this module,
 *    zero changes elsewhere.
 *
 * To wire Supabase: replace the `InMemoryJobRepository` implementation below
 * with a `SupabaseJobRepository` that calls the Supabase JS client.
 */

import { ParsedJob, AggregatedJob } from "./types";
import { isTool } from "./jd-parser";

// ─── Repository Interface (Persistence Abstraction) ───────────────────────────

export interface JobRepository {
  save(job: ParsedJob): Promise<void>;
  findAll(): Promise<AggregatedJob[]>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

// ─── In-Memory Implementation (default / dev) ─────────────────────────────────

class InMemoryJobRepository implements JobRepository {
  // Module-level singleton — survives across requests in a single Node.js process.
  private store = new Map<string, AggregatedJob>();

  async save(job: ParsedJob): Promise<void> {
    if (this.store.has(job.id)) return; // deduplicate by hash

    const allSkillsRaw = [
      ...job.required_skills,
      ...job.optional_skills,
      ...job.tools,
    ];

    // Deduplicate across all three lists
    const seen = new Set<string>();
    const allSkills: string[] = [];
    for (const s of allSkillsRaw) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allSkills.push(s);
      }
    }

    this.store.set(job.id, {
      id: job.id,
      parsedAt: job.parsedAt,
      allSkills,
      seniority: job.seniority,
      domain: job.domain,
    });
  }

  async findAll(): Promise<AggregatedJob[]> {
    return Array.from(this.store.values());
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────
// Replace this with your Supabase/Postgres repository to persist across restarts.

export const jobRepository: JobRepository = new InMemoryJobRepository();

/*
 * ── HOW TO SWAP TO SUPABASE ──────────────────────────────────────────────────
 *
 * import { createClient } from "@supabase/supabase-js";
 *
 * class SupabaseJobRepository implements JobRepository {
 *   private db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
 *
 *   async save(job: ParsedJob) {
 *     const allSkills = [...job.required_skills, ...job.optional_skills, ...job.tools];
 *     await this.db.from("jobs").upsert({
 *       id: job.id,
 *       parsed_at: job.parsedAt,
 *       all_skills: allSkills,
 *       seniority: job.seniority,
 *       domain: job.domain,
 *     });
 *   }
 *
 *   async findAll() {
 *     const { data } = await this.db.from("jobs").select("*");
 *     return (data ?? []).map(r => ({
 *       id: r.id, parsedAt: r.parsed_at, allSkills: r.all_skills,
 *       seniority: r.seniority, domain: r.domain,
 *     }));
 *   }
 *
 *   async count() {
 *     const { count } = await this.db.from("jobs").select("*", { count: "exact", head: true });
 *     return count ?? 0;
 *   }
 *
 *   async clear() {
 *     await this.db.from("jobs").delete().neq("id", "");
 *   }
 * }
 *
 * export const jobRepository: JobRepository = new SupabaseJobRepository();
 */
