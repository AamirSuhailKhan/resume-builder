import { NextRequest } from "next/server";
import { InterviewContributionType } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";
import { evaluateFraud, degradeContributorTrust } from "@/lib/interview-intelligence/fraud.engine";
import { GamificationService } from "@/lib/interview-intelligence/gamification.service";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contributionSchema = z.object({
  type:        z.nativeEnum(InterviewContributionType),
  companyName: z.string().trim().min(1).max(120),
  roleTitle:   z.string().trim().max(160).optional(),
  payload:     z.record(z.string(), z.unknown()),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const companyName = req.nextUrl.searchParams.get("company");
    const type        = req.nextUrl.searchParams.get("type");
    const limit       = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

    const contributions = await prisma.interviewContribution.findMany({
      where: {
        status: "approved",
        ...(companyName ? { companyName: { contains: companyName, mode: "insensitive" } } : {}),
        ...(type ? { type: type as InterviewContributionType } : {}),
      },
      orderBy: [{ verificationTier: "desc" }, { upvoteCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true, type: true, companyName: true, roleTitle: true,
        status: true, verificationTier: true, upvoteCount: true, downvoteCount: true,
        trustDelta: true, createdAt: true,
        // Omit payload for listing — fetch individually for privacy
        verification: { select: { tier: true, method: true, verifiedAt: true } },
      },
    });

    return apiOk(contributions);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = contributionSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid contribution.", 400);

    // ── STEP 1: Anti-Sybil / Fraud gate ──────────────────────────────────────
    const ipRaw = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
    const fraudResult = await evaluateFraud({
      userId:    user.id,
      payload:   parsed.data.payload,
      ipAddress: ipRaw?.split(",")[0]?.trim() ?? null,
    });

    if (fraudResult.shouldQuarantine) {
      // Silently accept (shadowban) — don't signal to abusers that they've been blocked
      await degradeContributorTrust(user.id, fraudResult.score);
      // Return a fake success response to prevent retry probing
      return apiOk({
        id: crypto.randomUUID(),
        status: "pending",
        type: parsed.data.type,
        _quarantined: true, // stripped from public response in production
      }, 201);
    }

    if (fraudResult.requiresReview) {
      // Submit but flag for review
      await prisma.moderationQueueItem.create({
        data: {
          queueType:  "fraud",
          entityType: "InterviewContribution",
          entityId:   "pending", // will update after creation
          summary:    `Fraud score ${(fraudResult.score * 100).toFixed(0)}% — ${fraudResult.reasons.join(", ")}`,
          priority:   1,
          fraudScore: fraudResult.score,
        },
      });
    }

    // ── STEP 2: Submit contribution ───────────────────────────────────────────
    const contribution = await InterviewIntelligenceService.submitContribution(user.id, {
      type:      parsed.data.type,
      companyName: parsed.data.companyName,
      payload:   parsed.data.payload,
      ...(parsed.data.roleTitle ? { roleTitle: parsed.data.roleTitle } : {}),
    });

    // Update moderation queue item with the real entity ID
    if (fraudResult.requiresReview) {
      await prisma.moderationQueueItem.updateMany({
        where: {
          queueType:  "fraud",
          entityType: "InterviewContribution",
          entityId:   "pending",
          status:     "pending",
        },
        data: { entityId: contribution.id },
      });
    }

    // ── STEP 3: Gamification ──────────────────────────────────────────────────
    const status = contribution.status as "approved" | "rejected";
    if (status === "approved" || status === "rejected") {
      await GamificationService.awardContributionPoints(
        user.id,
        parsed.data.type,
        status
      ).catch(() => undefined);
    }

    // ── STEP 4: Response with gamification context ────────────────────────────
    const userProfile = await GamificationService.getUserProfile(user.id).catch(() => null);
    const newBadges = await GamificationService.checkAndAwardBadges(user.id).catch(() => []);

    return apiOk({
      contribution,
      gamification: {
        newBadges,
        totalPoints: userProfile?.totalPoints ?? 0,
        currentStreak: userProfile?.currentStreak ?? 0,
        pointsEarned: contribution.status === "approved" ? 50 : 0,
      },
    }, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
