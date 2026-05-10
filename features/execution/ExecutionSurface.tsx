"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Loader2, MonitorPlay, WifiOff } from "lucide-react";
import { useEventSource } from "@/hooks/useEventSource";

interface ScreenshotFrame {
  id: string;
  url: string;
  storageKey: string; // data:image/jpeg;base64,... or remote URL
  createdAt: string;
}

interface ExecutionSurfaceProps {
  workflowId: string;
  /** SSR-hydrated latest screenshot */
  initialScreenshot: ScreenshotFrame | null;
  /** SSR-hydrated current URL from BrowserExecution */
  initialUrl: string | null;
  /** SSR-hydrated page title */
  initialTitle: string | null;
  /** Current execution status */
  executionStatus: string | null;
}

export function ExecutionSurface({
  workflowId,
  initialScreenshot,
  initialUrl,
  initialTitle,
  executionStatus,
}: ExecutionSurfaceProps) {
  const [screenshot, setScreenshot] = useState<ScreenshotFrame | null>(initialScreenshot);
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
  const [currentTitle, setCurrentTitle] = useState<string | null>(initialTitle);
  const [isUpdating, setIsUpdating] = useState(false);

  const isActive = executionStatus === "running" || executionStatus === "initializing";

  // Subscribe to workflow-scoped SSE
  useEventSource(`/api/v1/workflows/${workflowId}/events`, {
    autoReconnect: true,
    onMessage: (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "heartbeat" || event.type === "connected") return;

        const payload = event.payload ?? {};

        // Live screenshot streamed from BrowserExecutor.captureScreenshot()
        if (payload.type === "screenshot" && payload.data) {
          setIsUpdating(true);
          setScreenshot({
            id: payload.id ?? String(Date.now()),
            url: payload.url ?? currentUrl ?? "",
            storageKey: payload.data,
            createdAt: payload.timestamp ?? new Date().toISOString(),
          });
          setTimeout(() => setIsUpdating(false), 600);
        }

        // Navigation events update the URL/title bar
        if (event.type === "tool.called" && payload.action === "navigate") {
          setCurrentUrl(payload.url ?? null);
        }
      } catch {
        // silently ignore malformed SSE frames
      }
    },
  });

  const idle = !screenshot && !isActive;
  const hostname = currentUrl ? (() => { try { return new URL(currentUrl).hostname; } catch { return currentUrl; } })() : null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-[#0a0a0a] overflow-hidden shadow-2xl">
      {/* Browser chrome bar */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-[#111] px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>

        {/* URL bar */}
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border/50 bg-black/60 px-3 py-1.5 text-xs">
          <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground font-mono">
            {currentUrl ?? "Waiting for browser…"}
          </span>
          {isActive && (
            <Loader2 className="ml-auto h-3 w-3 shrink-0 animate-spin text-blue-400" />
          )}
        </div>

        {/* Status pill */}
        <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
          isActive
            ? "bg-green-500/15 text-green-400"
            : executionStatus === "completed"
            ? "bg-slate-500/15 text-slate-400"
            : executionStatus === "failed"
            ? "bg-red-500/15 text-red-400"
            : "bg-zinc-800 text-zinc-500"
        }`}>
          {isActive && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" /></span>}
          {executionStatus ?? "idle"}
        </div>
      </div>

      {/* Page title strip */}
      {currentTitle && (
        <div className="border-b border-border/30 bg-[#0d0d0d] px-4 py-1.5 text-[11px] text-zinc-500 font-mono truncate">
          {currentTitle}
        </div>
      )}

      {/* Screenshot viewport */}
      <div className="relative flex-1 overflow-hidden bg-[#050505]">
        <AnimatePresence mode="wait">
          {screenshot ? (
            <motion.div
              key={screenshot.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshot.storageKey}
                alt={`Browser — ${hostname ?? "unknown"}`}
                className="h-full w-full object-contain object-top"
              />
              {/* Flash overlay on update */}
              {isUpdating && (
                <motion.div
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="pointer-events-none absolute inset-0 bg-blue-400/20"
                />
              )}
              {/* Timestamp badge */}
              <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] text-zinc-400 backdrop-blur-sm border border-border/30">
                {new Date(screenshot.createdAt).toLocaleTimeString()}
              </div>
            </motion.div>
          ) : idle ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center gap-4 text-center"
            >
              <MonitorPlay className="h-12 w-12 text-zinc-700" />
              <div>
                <p className="text-sm font-medium text-zinc-500">No execution in progress</p>
                <p className="mt-1 text-xs text-zinc-600">Screenshots will appear here when the AI agent starts a browser session.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center gap-4"
            >
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-zinc-400">Initializing browser session…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
