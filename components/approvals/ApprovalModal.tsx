"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bot, CheckCircle2, Clock, ExternalLink,
  Shield, X, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WorkflowRunSummary {
  id: string;
  type: string;
  goal: string;
  status: string;
}

export interface ApprovalRecord {
  id: string;
  type: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  riskFlags?: Record<string, unknown> | null;
  expiresAt: string | null;
  createdAt: string;
  workflowId: string | null;
  workflowRun?: WorkflowRunSummary | null;
}

interface ApprovalModalProps {
  approval: ApprovalRecord;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setRemaining(null);
        return;
      }
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${mins}m ${secs}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { remaining, expired };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApprovalModal({
  approval,
  onApprove,
  onReject,
  onClose,
  isLoading = false,
}: ApprovalModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const { remaining, expired } = useCountdown(approval.expiresAt);

  const payload = approval.payload ?? {};
  const screenshotData = typeof payload.screenshotData === "string" ? payload.screenshotData : null;
  const currentUrl = typeof payload.currentUrl === "string" ? payload.currentUrl : null;
  const formFields = Array.isArray(payload.formFields) ? payload.formFields as Array<{ field: string; value: string }> : null;

  // Focus trap
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab") return;
    const modal = e.currentTarget as HTMLElement;
    const focusable = modal.querySelectorAll<HTMLElement>(
      "button:not([disabled]), textarea:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    if (!focusable.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  // Keyboard escape on mount
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-title"
          onKeyDown={handleKeyDown}
          className="relative w-full max-w-xl rounded-2xl border border-border bg-[#111] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-border/60 px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Agent waiting for approval</p>
              <h2 id="approval-title" className="mt-0.5 text-base font-semibold text-foreground truncate">
                {approval.title}
              </h2>
            </div>
            {/* Countdown */}
            {remaining && !expired && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-400">
                <Clock className="h-3 w-3" />
                {remaining}
              </div>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Expired state */}
          {expired && (
            <div className="px-6 py-4 bg-red-950/30 border-b border-red-500/20">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This approval has expired. The workflow has been automatically canceled.
              </p>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Workflow context */}
            {approval.workflowRun && (
              <div className="rounded-xl border border-border/60 bg-[#0d0d0d] p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="neutral" className="capitalize">{approval.workflowRun.type.replace(/_/g, " ")}</Badge>
                  <Badge variant={approval.workflowRun.status === "running" ? "primary" : "neutral"}>
                    {approval.workflowRun.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{approval.workflowRun.goal}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{approval.summary}</p>
              </div>
            )}

            {/* Screenshot preview */}
            {screenshotData && (
              <div className="rounded-xl overflow-hidden border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenshotData} alt="Agent browser state" className="w-full h-auto max-h-48 object-cover object-top" />
              </div>
            )}

            {/* Current URL */}
            {currentUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-[#0d0d0d] px-3 py-2">
                <span className="text-xs text-muted-foreground truncate font-mono flex-1">
                  {currentUrl}
                </span>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-accent hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Form fields preview */}
            {formFields && formFields.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-[#0d0d0d] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fields agent will fill</p>
                </div>
                <div className="divide-y divide-border/30">
                  {formFields.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                      <span className="text-muted-foreground w-32 shrink-0 truncate">{f.field}</span>
                      <span className="text-foreground truncate">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk flags */}
            {approval.riskFlags && Object.keys(approval.riskFlags).length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-900/10 px-3 py-2.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-400">
                  Risk signals detected. Review carefully before approving.
                </p>
              </div>
            )}

            {/* Reject reason textarea */}
            {showRejectForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <label className="text-xs font-medium text-foreground">Reason for rejection (optional)</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tell the agent why this action was rejected…"
                  className="min-h-[80px] resize-none text-sm"
                  autoFocus
                />
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-6 py-4 space-y-2 bg-[#0d0d0d]">
            {!expired && !showRejectForm && (
              <>
                <Button
                  ref={firstFocusRef}
                  className="w-full"
                  onClick={onApprove}
                  isLoading={isLoading}
                  disabled={isLoading || expired}
                  id="approval-approve-btn"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve — let the agent continue
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-400 border-red-500/30 hover:bg-red-950/20"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isLoading}
                  id="approval-reject-btn"
                >
                  <XCircle className="h-4 w-4" />
                  Reject — stop this action
                </Button>
              </>
            )}

            {!expired && showRejectForm && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRejectForm(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-white bg-red-600 hover:bg-red-700"
                  onClick={() => onReject()}
                  isLoading={isLoading}
                  id="approval-confirm-reject-btn"
                >
                  <XCircle className="h-4 w-4" />
                  Confirm rejection
                </Button>
              </div>
            )}

            {approval.workflowId && (
              <p className="text-center text-[10px] text-zinc-600">
                Execution logs at{" "}
                <a href={`/execution/${approval.workflowId}`} className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
                  /execution/{approval.workflowId.slice(0, 8)}…
                </a>
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
