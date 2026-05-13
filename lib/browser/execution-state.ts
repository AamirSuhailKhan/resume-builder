import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { BrowserExecutionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Valid state transitions for BrowserExecution
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS: Record<BrowserExecutionStatus, BrowserExecutionStatus[]> = {
  queued:                ["booting", "canceled"],
  booting:               ["navigating", "failed", "canceled"],
  navigating:            ["authenticating", "waiting_for_selector", "filling_form", "captcha_required", "failed", "canceled"],
  authenticating:        ["navigating", "waiting_for_selector", "failed", "canceled"],
  waiting_for_selector:  ["filling_form", "navigating", "captcha_required", "failed", "canceled", "timed_out"],
  filling_form:          ["waiting_for_approval", "uploading_resume", "submitting", "captcha_required", "failed", "canceled"],
  uploading_resume:      ["filling_form", "submitting", "failed", "canceled"],
  waiting_for_approval:  ["filling_form", "submitting", "canceled"],
  captcha_required:      ["navigating", "filling_form", "failed", "canceled"],
  submitting:            ["completed", "failed", "canceled"],
  completed:             [],
  failed:                [],
  canceled:              [],
  timed_out:             [],
};

// Terminal states — no transitions out
const TERMINAL_STATES = new Set<BrowserExecutionStatus>([
  "completed", "failed", "canceled", "timed_out",
]);

export class BrowserExecutionStateMachine {
  /**
   * Transition an execution to a new status.
   * Validates the transition is legal, then persists it atomically.
   * Returns the updated record.
   */
  static async transition(
    executionId: string,
    nextStatus: BrowserExecutionStatus,
    opts?: { metadata?: Record<string, unknown>; error?: string }
  ) {
    const execution = await prisma.browserExecution.findUniqueOrThrow({
      where: { id: executionId },
      select: { id: true, status: true, workflowId: true, userId: true },
    });

    const currentStatus = execution.status as BrowserExecutionStatus;

    if (currentStatus === nextStatus) {
      // Idempotent — already in this state
      return execution;
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      const msg = `[StateMachine] Illegal transition: ${currentStatus} → ${nextStatus} for execution ${executionId}`;
      logger.error({ executionId, currentStatus, nextStatus }, msg);
      throw new Error(msg);
    }

    const updates: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: new Date(),
    };

    if (nextStatus === "booting") updates.startedAt = new Date();
    if (TERMINAL_STATES.has(nextStatus)) updates.completedAt = new Date();

    if (opts?.metadata) {
      // Merge metadata rather than overwrite
      const current = await prisma.browserExecution.findUnique({
        where: { id: executionId },
        select: { metadata: true },
      });
      updates.metadata = { ...(current?.metadata as object ?? {}), ...opts.metadata };
    }

    const updated = await prisma.browserExecution.update({
      where: { id: executionId },
      data: updates as Parameters<typeof prisma.browserExecution.update>[0]["data"],
    });

    logger.info(
      { executionId, from: currentStatus, to: nextStatus },
      `[StateMachine] ${currentStatus} → ${nextStatus}`
    );

    return updated;
  }

  /**
   * Update the heartbeat timestamp for an active execution.
   */
  static async heartbeat(executionId: string) {
    await prisma.browserExecution.updateMany({
      where: { id: executionId },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  static isTerminal(status: BrowserExecutionStatus): boolean {
    return TERMINAL_STATES.has(status);
  }

  static getAllowedTransitions(status: BrowserExecutionStatus): BrowserExecutionStatus[] {
    return ALLOWED_TRANSITIONS[status] ?? [];
  }
}
