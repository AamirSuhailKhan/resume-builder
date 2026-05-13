import zlib from "zlib";
import { promisify } from "util";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

const gzip = promisify(zlib.gzip);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RecordActionOpts {
  executionId: string;
  workflowId: string;
  stepId?: string;
  parentActionId?: string;
  actionType: "click" | "type" | "navigate" | "submit" | "scroll" | "wait" | "extract";
  selector?: string;
  value?: string;
  url: string;
  success: boolean;
  errorMessage?: string;
  /** Raw DOM/context snapshot — will be gzip-compressed before storage */
  domSnapshot?: Record<string, unknown>;
}

export interface RecordScreenshotOpts {
  executionId: string;
  workflowId: string;
  url: string;
  screenshotBuffer: Buffer;
}

export interface RecordReasoningOpts {
  executionId: string;
  workflowId: string;
  decision: string;
  reasoning: string;
  confidence?: number;
  alternatives?: unknown[];
  context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ExecutionRecorder
// Single-responsibility: persist all observability data for a browser run.
// BrowserExecutor emits → ExecutionRecorder stores.
// ---------------------------------------------------------------------------
export class ExecutionRecorder {
  private readonly executionId: string;
  private readonly workflowId: string;

  constructor(executionId: string, workflowId: string) {
    this.executionId = executionId;
    this.workflowId = workflowId;
  }

  /**
   * Record a single DOM action.
   * Compresses the optional DOM snapshot using gzip before storage.
   * Returns the persisted action's id — callers use this as parentActionId.
   */
  async recordAction(opts: Omit<RecordActionOpts, "executionId" | "workflowId">): Promise<string> {
    let compressedSnapshot: Buffer | null = null;

    if (opts.domSnapshot) {
      try {
        compressedSnapshot = await gzip(JSON.stringify(opts.domSnapshot));
      } catch (err) {
        logger.warn({ err }, "[ExecutionRecorder] Failed to compress DOM snapshot — skipping.");
      }
    }

    const action = await prisma.dOMAction.create({
      data: {
        executionId: this.executionId,
        workflowId: this.workflowId,
        ...(opts.stepId ? { stepId: opts.stepId } : {}),
        ...(opts.parentActionId ? { parentActionId: opts.parentActionId } : {}),
        actionType: opts.actionType,
        ...(opts.selector ? { selector: opts.selector } : {}),
        ...(opts.value ? { value: opts.value } : {}),
        url: opts.url,
        success: opts.success,
        ...(opts.errorMessage ? { errorMessage: opts.errorMessage } : {}),
        ...(compressedSnapshot ? { compressedSnapshot } : {}),
        timestamp: new Date(),
      },
    });

    logger.debug(
      { actionId: action.id, actionType: opts.actionType, url: opts.url, success: opts.success },
      "[ExecutionRecorder] Action recorded."
    );

    return action.id;
  }

  /**
   * Upload a screenshot buffer to Supabase Storage.
   * Only metadata (key, url, dimensions) is stored in the DB — never the blob.
   */
  async recordScreenshot(opts: Omit<RecordScreenshotOpts, "executionId" | "workflowId">): Promise<string | null> {
    const key = `executions/${this.workflowId}/${this.executionId}/${Date.now()}.webp`;

    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("executions")
        .upload(key, opts.screenshotBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      await prisma.executionScreenshot.create({
        data: {
          executionId: this.executionId,
          workflowId: this.workflowId,
          url: opts.url,
          storageKey: key,
        },
      });

      logger.debug({ key, url: opts.url }, "[ExecutionRecorder] Screenshot stored.");
      return key;
    } catch (err) {
      logger.error({ err, key }, "[ExecutionRecorder] Screenshot upload failed.");
      return null;
    }
  }

  /**
   * Record an AI reasoning step — the "why" behind each browser decision.
   */
  async recordReasoning(opts: Omit<RecordReasoningOpts, "executionId" | "workflowId">): Promise<void> {
    try {
      await prisma.executionReasoning.create({
        data: {
          executionId: this.executionId,
          workflowId: this.workflowId,
          decision: opts.decision,
          reasoning: opts.reasoning,
          confidence: opts.confidence ?? 0.8,
          alternatives: (opts.alternatives ?? []) as import("@prisma/client").Prisma.InputJsonValue,
          context: (opts.context ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      logger.warn({ err }, "[ExecutionRecorder] Failed to record reasoning.");
    }
  }

  /**
   * Decompress a stored DOM snapshot back to its original form.
   * Utility for replay/debugging use-cases.
   */
  static async decompressSnapshot(compressed: Buffer): Promise<Record<string, unknown>> {
    const decompressed = await promisify(zlib.gunzip)(compressed);
    return JSON.parse(decompressed.toString("utf8"));
  }
}
