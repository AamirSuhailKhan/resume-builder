import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { ScamJobDetector } from "@/lib/job-intelligence/scam-detector";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const reason = body?.reason;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const redis = getRedisClient();
    if (redis) {
      const rateKey = `scam_report:${user.id}:${jobId}`;
      const hasReported = await redis.get(rateKey);
      if (hasReported) {
        return NextResponse.json(
          { error: "You have already reported this job." },
          { status: 429 }
        );
      }
      // Set to expire in 30 days (effectively preventing duplicate reports for the life of the posting)
      await redis.set(rateKey, "1", { ex: 30 * 24 * 60 * 60 });
    }

    // Increment reports
    const job = await prisma.jobOpportunity.update({
      where: { id: jobId },
      data: {
        scamReports: { increment: 1 },
      },
    });

    // Automatically flag as scam if 3+ reports, or recalculate via ScamDetector if less.
    if (job.scamReports >= 3 && job.scamVerdict !== "scam") {
      await prisma.jobOpportunity.update({
        where: { id: jobId },
        data: {
          scamVerdict: "scam",
          scamScore: 100,
        },
      });
    } else if (job.scamReports < 3) {
      // Recalculate score (it will pick up the new community report)
      const detector = new ScamJobDetector();
      const res = await detector.detectScam({
        title: job.role,
        company: job.company,
        url: job.sourceUrl,
        description: job.description,
        salaryRange: job.salaryRange,
        scamReports: job.scamReports,
      });

      await prisma.jobOpportunity.update({
        where: { id: jobId },
        data: {
          scamScore: res.score,
          scamVerdict: res.verdict,
          scamSignals: { signals: res.signals, detectedAt: new Date().toISOString() },
        },
      });
    }

    return NextResponse.json({ reported: true, totalReports: job.scamReports });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
