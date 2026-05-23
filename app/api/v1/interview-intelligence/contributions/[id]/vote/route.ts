import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { GamificationService } from "@/lib/interview-intelligence/gamification.service";
import { ContributionVerificationService } from "@/lib/interview-intelligence/verification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const voteSchema = z.object({
  type: z.enum(["helpful", "not_helpful", "inaccurate"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: contributionId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid vote type.", 400);

    // Fetch the contribution to get the original contributor
    const contribution = await prisma.interviewContribution.findUnique({
      where: { id: contributionId },
      select: { id: true, userId: true, upvoteCount: true, downvoteCount: true, status: true },
    });
    if (!contribution) return apiError("Contribution not found.", 404);

    // Users cannot vote on their own contributions
    if (contribution.userId === user.id) {
      return apiError("You cannot vote on your own contribution.", 403);
    }

    // Upsert the vote (one vote per user per contribution)
    const existingVote = await prisma.contributionVote.findUnique({
      where: { contributionId_userId: { contributionId, userId: user.id } },
    });

    if (existingVote) {
      if (existingVote.type === parsed.data.type) {
        // Remove vote (toggle off)
        await prisma.contributionVote.delete({ where: { id: existingVote.id } });
        const toggleData = parsed.data.type === "helpful"
          ? { upvoteCount: { decrement: 1 } }
          : { downvoteCount: { decrement: 1 } };
        await prisma.interviewContribution.update({
          where: { id: contributionId },
          data: toggleData,
        });
        return apiOk({ toggled: false, message: "Vote removed" });
      }
      // Change vote type
      await prisma.contributionVote.update({
        where: { id: existingVote.id },
        data: { type: parsed.data.type },
      });
    } else {
      await prisma.contributionVote.create({
        data: { contributionId, userId: user.id, type: parsed.data.type },
      });
    }

    // Update vote counts on the contribution
    const allVotes = await prisma.contributionVote.groupBy({
      by: ["type"],
      where: { contributionId },
      _count: { type: true },
    });
    const upvotes = allVotes.find((v) => v.type === "helpful")?._count.type ?? 0;
    const downvotes = allVotes.find((v) => v.type !== "helpful")?._count.type ?? 0;

    await prisma.interviewContribution.update({
      where: { id: contributionId },
      data: { upvoteCount: upvotes, downvoteCount: downvotes },
    });

    // Award points to the original contributor for receiving votes
    await GamificationService.awardVotePoints(contribution.userId, parsed.data.type === "helpful");

    // Check if peer corroboration threshold reached (3+ helpful votes from trusted users)
    const peerResult = await ContributionVerificationService.evaluatePeerCorroboration(contributionId);

    // Auto-approve if 5+ helpful votes and currently pending/needs_review
    if (upvotes >= 5 && (contribution.status === "pending" || contribution.status === "needs_review")) {
      await prisma.interviewContribution.update({
        where: { id: contributionId },
        data: { status: "approved" },
      });
    }

    // Auto-flag for review if 3+ downvotes/inaccurate from verified contributors
    if (downvotes >= 3 && contribution.status === "approved") {
      await prisma.interviewContribution.update({
        where: { id: contributionId },
        data: { status: "needs_review" },
      });
    }

    return apiOk({
      upvotes,
      downvotes,
      peerVerified: !!peerResult,
      verificationTier: peerResult?.tier ?? null,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
