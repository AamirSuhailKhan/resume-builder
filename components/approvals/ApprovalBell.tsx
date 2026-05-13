"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ApprovalModal, type ApprovalRecord } from "@/components/approvals/ApprovalModal";

type PendingResponse = {
  approvals: ApprovalRecord[];
};

export function ApprovalBell() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [activeApproval, setActiveApproval] = useState<ApprovalRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/approvals/pending", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as PendingResponse;
      setApprovals(data.approvals ?? []);
    } catch {
      // silently fail — bell is non-critical
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchPending();
    pollRef.current = setInterval(fetchPending, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchPending]);

  // Show modal for the most urgent pending approval
  useEffect(() => {
    if (approvals.length > 0 && !activeApproval) {
      setActiveApproval(approvals[0]!);
      setOpen(true);
    }
  }, [approvals, activeApproval]);

  const handleApprove = async () => {
    if (!activeApproval) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/v1/approvals/${activeApproval.id}/approve`, { method: "POST" });
      setApprovals((prev) => prev.filter((a) => a.id !== activeApproval.id));
      setActiveApproval(null);
      setOpen(false);
      await fetchPending();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeApproval) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/v1/approvals/${activeApproval.id}/reject`, { method: "POST" });
      setApprovals((prev) => prev.filter((a) => a.id !== activeApproval.id));
      setActiveApproval(null);
      setOpen(false);
      await fetchPending();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setActiveApproval(null);
  };

  const count = approvals.length;

  return (
    <>
      {/* Bell icon in nav */}
      <button
        id="approval-bell"
        aria-label={count > 0 ? `${count} pending approval${count > 1 ? "s" : ""}` : "No pending approvals"}
        onClick={() => {
          if (count > 0) {
            setActiveApproval(approvals[0]!);
            setOpen(true);
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
      >
        {count > 0 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center"
          >
            <Bell className="h-4 w-4 text-amber-400" />
          </motion.div>
        ) : (
          <Bell className="h-4 w-4" />
        )}

        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black"
            >
              {count > 9 ? "9+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Toast banner for urgent approvals */}
      <AnimatePresence>
        {count > 0 && !open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed right-4 top-[72px] z-40 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-[#111] px-4 py-3 shadow-xl"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-foreground">
              Agent needs your approval
            </p>
            <button
              onClick={() => { setActiveApproval(approvals[0]!); setOpen(true); }}
              className="ml-1 text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Review →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      {open && activeApproval && (
        <ApprovalModal
          approval={activeApproval}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={handleClose}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}
