"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock, Coins, ImageIcon, Zap } from "lucide-react";
import { useEventSource } from "@/hooks/useEventSource";

interface ExecutionStatusBarProps {
  workflowId: string;
  workflowStatus: string;
  agentRuns: Array<{ costUsd: number }>;
  initialScreenshotCount: number;
  startedAt: string | null;
}

export function ExecutionStatusBar({
  workflowId,
  workflowStatus,
  agentRuns,
  initialScreenshotCount,
  startedAt,
}: ExecutionStatusBarProps) {
  const [screenshotCount, setScreenshotCount] = useState(initialScreenshotCount);
  const [eventCount, setEventCount] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const totalCost = agentRuns.reduce((sum, r) => sum + r.costUsd, 0);

  useEventSource(`/api/v1/workflows/${workflowId}/events`, {
    autoReconnect: true,
    onMessage: (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "heartbeat" || event.type === "connected") return;

        setEventCount((n) => n + 1);

        const payload = event.payload ?? {};
        if (payload.type === "screenshot") setScreenshotCount((n) => n + 1);
        if (payload.latencyMs) setLatency(payload.latencyMs);
      } catch { /* ignore */ }
    },
  });

  const elapsed = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
    : null;

  const isLive = workflowStatus === "running" || workflowStatus === "initializing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-6 rounded-xl border border-border/60 bg-[#0d0d0d] px-5 py-3 text-xs font-mono"
    >
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-green-400 font-semibold uppercase tracking-widest text-[10px]">Live</span>
          </>
        ) : (
          <span className="text-zinc-600 uppercase tracking-widest text-[10px]">{workflowStatus}</span>
        )}
      </div>

      <div className="h-4 w-px bg-border/40" />

      {/* Elapsed */}
      {elapsed !== null && (
        <Stat icon={<Clock className="h-3 w-3" />} label={`${elapsed}s elapsed`} />
      )}

      {/* Events */}
      <Stat icon={<Activity className="h-3 w-3" />} label={`${eventCount} events`} />

      {/* Screenshots */}
      <Stat icon={<ImageIcon className="h-3 w-3" />} label={`${screenshotCount} frames`} />

      {/* AI cost */}
      <Stat icon={<Coins className="h-3 w-3" />} label={`$${totalCost.toFixed(4)}`} />

      {/* Latency */}
      {latency !== null && (
        <Stat icon={<Zap className="h-3 w-3" />} label={`${latency}ms`} />
      )}
    </motion.div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-zinc-500">
      <span className="text-zinc-600">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
