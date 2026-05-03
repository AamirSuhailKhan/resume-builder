/**
 * POST /api/job/analyze
 *
 * Accepts one or more raw job descriptions, parses each through the AI JD Parser,
 * persists them in the Job Aggregator, and returns the structured ParsedJob output.
 *
 * Request body (JSON):
 * {
 *   jobDescriptions: string[]   // 1 to 50 JDs
 * }
 *
 * Response:
 * {
 *   parsed: ParsedJob[],
 *   jobsInDatabase: number
 * }
 */

import { NextResponse } from "next/server";
import { parseJobDescription } from "@/lib/job-intelligence/jd-parser";
import { jobRepository } from "@/lib/job-intelligence/job-aggregator";
import { invalidateMarketCache } from "@/lib/job-intelligence/market-analyzer";
import { ParsedJob } from "@/lib/job-intelligence/types";

const MAX_JDS = 50;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Input validation ────────────────────────────────────────────────────
    if (!body || !Array.isArray(body.jobDescriptions)) {
      return NextResponse.json(
        { error: "Request body must include a `jobDescriptions` string array." },
        { status: 400 }
      );
    }

    const rawJDs: string[] = body.jobDescriptions
      .map((jd: unknown) => (typeof jd === "string" ? jd.trim() : ""))
      .filter(Boolean);

    if (rawJDs.length === 0) {
      return NextResponse.json(
        { error: "At least one non-empty job description is required." },
        { status: 400 }
      );
    }

    if (rawJDs.length > MAX_JDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_JDS} job descriptions per request.` },
        { status: 400 }
      );
    }

    // ── Parse each JD (parallel, up to 5 concurrent to respect API rate limits) ──
    const results: ParsedJob[] = [];
    const errors: { index: number; error: string }[] = [];

    // Batch into groups of 5 to avoid hitting Gemini rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < rawJDs.length; i += BATCH_SIZE) {
      const batch = rawJDs.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((jd) => parseJobDescription(jd))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === "fulfilled") {
          results.push(result.value);
          // Persist each parsed job and invalidate cache
          await jobRepository.save(result.value);
        } else {
          errors.push({ index: i + j, error: result.reason?.message ?? "Parse failed" });
        }
      }
    }

    // Invalidate market report cache so next /api/job/insights gets fresh data
    if (results.length > 0) {
      invalidateMarketCache();
    }

    const jobsInDatabase = await jobRepository.count();

    return NextResponse.json({
      parsed: results,
      jobsInDatabase,
      ...(errors.length > 0 && { parseErrors: errors }),
    });
  } catch (error: any) {
    console.error("[POST /api/job/analyze]", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
