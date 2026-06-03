/**
 * POST /api/v1/career-graph/trigger
 * Receives a GraphUpdateTrigger event from other platform services.
 * Updates the graph and invalidates relevant caches.
 *
 * Body: { type: GraphUpdateTrigger["type"], payload: {...} }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { GraphBuilderService, GraphCacheService } from "@/lib/career-graph";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RESUME_UPLOADED"), payload: z.object({ resumeId: z.string() }) }),
  z.object({ type: z.literal("RESUME_EDITED"), payload: z.object({ resumeId: z.string(), fields: z.array(z.string()) }) }),
  z.object({ type: z.literal("JOB_SAVED"), payload: z.object({ jobOpportunityId: z.string() }) }),
  z.object({ type: z.literal("JOB_APPLIED"), payload: z.object({ applicationId: z.string() }) }),
  z.object({
    type: z.literal("INTERVIEW_COMPLETED"),
    payload: z.object({ sessionId: z.string(), outcome: z.string() }),
  }),
  z.object({
    type: z.literal("SKILL_ADDED"),
    payload: z.object({ skill: z.string(), source: z.string() }),
  }),
  z.object({
    type: z.literal("CERTIFICATION_ADDED"),
    payload: z.object({
      certificationData: z.object({
        name: z.string(),
        issuer: z.string(),
        issuedAt: z.string(),
        expiresAt: z.string().nullable(),
        credentialId: z.string().nullable(),
        skills: z.array(z.string()),
        verificationUrl: z.string().nullable(),
      }),
    }),
  }),
  z.object({
    type: z.literal("OFFER_RECEIVED"),
    payload: z.object({
      offerData: z.object({
        company: z.string(),
        role: z.string(),
        baseAmount: z.number(),
        totalCtc: z.number(),
        currency: z.string(),
        receivedAt: z.string(),
        expiresAt: z.string().nullable(),
        status: z.enum(["pending", "accepted", "rejected", "negotiating"]),
      }),
    }),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const parsed = TriggerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trigger payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const trigger = parsed.data;
    logger.info({ userId, triggerType: trigger.type }, "[GraphTrigger] Processing");

    await GraphBuilderService.handleTrigger(userId, trigger);
    await GraphCacheService.invalidateAll(userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[POST /api/v1/career-graph/trigger] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
