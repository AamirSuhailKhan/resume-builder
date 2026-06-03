/**
 * graph-trigger.ts
 * Platform-wide helper to fire Career Graph triggers from any server action.
 * Import and call after mutations — fire-and-forget, never throws.
 */
import type { GraphUpdateTrigger } from "@/lib/career-graph/types";
import { logger } from "@/lib/logger";

/**
 * Fire a graph update trigger in the background.
 * Safe to call from API routes, server actions, and workers.
 * Non-blocking — uses void fetch internally.
 */
export async function emitGraphTrigger(
  userId: string,
  trigger: GraphUpdateTrigger,
  baseUrl?: string
): Promise<void> {
  try {
    const url = `${baseUrl ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/v1/career-graph/trigger`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Internal service call — pass userId via header for auth bypass in same-process calls
        "x-internal-user-id": userId,
      },
      body: JSON.stringify(trigger),
    });
    if (!res.ok) {
      logger.warn({ userId, trigger: trigger.type, status: res.status }, "[GraphTrigger] Non-OK response");
    }
  } catch (err) {
    // Never throw — graph updates are best-effort
    logger.warn({ userId, trigger: trigger.type, err }, "[GraphTrigger] Emit failed (non-fatal)");
  }
}

/**
 * Convenience: emit trigger but do not await (true fire-and-forget).
 * Use in places where you cannot use async (e.g. event handlers, stream callbacks).
 */
export function emitGraphTriggerBg(
  userId: string,
  trigger: GraphUpdateTrigger,
  baseUrl?: string
): void {
  void emitGraphTrigger(userId, trigger, baseUrl);
}

// ─── Named shortcuts ──────────────────────────────────────────────────────────

export const GraphTriggers = {
  resumeUploaded: (userId: string, resumeId: string) =>
    emitGraphTriggerBg(userId, { type: "RESUME_UPLOADED", payload: { resumeId } }),

  resumeEdited: (userId: string, resumeId: string, fields: string[]) =>
    emitGraphTriggerBg(userId, { type: "RESUME_EDITED", payload: { resumeId, fields } }),

  jobSaved: (userId: string, jobOpportunityId: string) =>
    emitGraphTriggerBg(userId, { type: "JOB_SAVED", payload: { jobOpportunityId } }),

  jobApplied: (userId: string, applicationId: string) =>
    emitGraphTriggerBg(userId, { type: "JOB_APPLIED", payload: { applicationId } }),

  interviewCompleted: (userId: string, sessionId: string, outcome: string) =>
    emitGraphTriggerBg(userId, { type: "INTERVIEW_COMPLETED", payload: { sessionId, outcome } }),

  skillAdded: (userId: string, skill: string, source: string) =>
    emitGraphTriggerBg(userId, { type: "SKILL_ADDED", payload: { skill, source } }),

  offerReceived: (
    userId: string,
    offerData: Extract<GraphUpdateTrigger, { type: "OFFER_RECEIVED" }>["payload"]["offerData"]
  ) =>
    emitGraphTriggerBg(userId, { type: "OFFER_RECEIVED", payload: { offerData } }),
};
