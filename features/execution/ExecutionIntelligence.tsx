"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointerClick, Keyboard, Navigation, Upload,
  AlertTriangle, CheckCircle2, Brain, ChevronRight,
} from "lucide-react";
import { useEventSource } from "@/hooks/useEventSource";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionType = "click" | "type" | "navigate" | "submit" | "extract" | "upload" | "wait";

interface DOMActionEntry {
  id: string;
  actionType: ActionType | string;
  selector: string | null;
  value: string | null;
  url: string;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface ReasoningEntry {
  id: string;
  decision: string;
  reasoning: string;
  confidence: number;
  createdAt: string;
}

interface ExecutionIntelligenceProps {
  workflowId: string;
  initialDomActions: DOMActionEntry[];
  initialReasoning: ReasoningEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionIcon(type: string) {
  switch (type) {
    case "click":    return <MousePointerClick className="h-3.5 w-3.5" />;
    case "type":     return <Keyboard className="h-3.5 w-3.5" />;
    case "navigate": return <Navigation className="h-3.5 w-3.5" />;
    case "upload":   return <Upload className="h-3.5 w-3.5" />;
    default:         return <ChevronRight className="h-3.5 w-3.5" />;
  }
}

function actionLabel(action: DOMActionEntry): string {
  switch (action.actionType) {
    case "navigate": return `Navigating to ${(() => { try { return new URL(action.url).hostname; } catch { return action.url; } })()}`;
    case "click":    return `Clicking ${action.selector ?? "element"}`;
    case "type":     return `Typing "${action.value ?? ""}" into ${action.selector ?? "field"}`;
    case "extract":  return `Extracting text from ${action.selector ?? "page"}`;
    case "upload":   return `Uploading file to ${action.selector ?? "field"}`;
    case "submit":   return `Submitting form`;
    default:         return `${action.actionType} on ${action.selector ?? action.url}`;
  }
}

function confidenceBar(confidence: number) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 font-mono">{pct}%</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExecutionIntelligence({
  workflowId,
  initialDomActions,
  initialReasoning,
}: ExecutionIntelligenceProps) {
  const [actions, setActions] = useState<DOMActionEntry[]>(initialDomActions);
  const [reasoning, setReasoning] = useState<ReasoningEntry[]>(initialReasoning);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new events arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actions.length]);

  // Live SSE subscription for this workflow
  useEventSource(`/api/v1/workflows/${workflowId}/events`, {
    autoReconnect: true,
    onMessage: (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "heartbeat" || event.type === "connected") return;
        const payload = event.payload ?? {};

        // DOM Action streamed from BrowserExecutor.recordAction()
        if (event.type === "tool.called" && payload.action) {
          setActions((prev) => {
            if (prev.some((a) => a.id === payload.actionId)) return prev;
            const entry: DOMActionEntry = {
              id: payload.actionId ?? String(Date.now()),
              actionType: payload.action,
              selector: payload.selector ?? null,
              value: payload.value ?? null,
              url: payload.url ?? "",
              success: true,
              errorMessage: null,
              createdAt: new Date().toISOString(),
            };
            return [...prev, entry].slice(-50);
          });
        }

        // Reasoning entry
        if (event.type === "agent.reasoning" && payload.decision) {
          setReasoning((prev) => {
            const entry: ReasoningEntry = {
              id: payload.id ?? String(Date.now()),
              decision: payload.decision,
              reasoning: payload.reasoning ?? "",
              confidence: payload.confidence ?? 0.8,
              createdAt: new Date().toISOString(),
            };
            return [entry, ...prev].slice(0, 20);
          });
        }
      } catch { /* ignore */ }
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Execution Intelligence</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
          {actions.length} actions
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
        {/* Latest AI Reasoning block — always on top */}
        {reasoning.length > 0 && (() => {
            const top = reasoning[0]!;
            return (
              <div className="mb-3 rounded-lg border border-purple-500/20 bg-purple-900/10 p-3">
                <div className="flex items-center gap-2 text-purple-400 mb-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  <span className="font-semibold text-[11px] uppercase tracking-wider">AI Reasoning</span>
                </div>
                <p className="text-[11px] font-semibold text-purple-200 mb-0.5">{top.decision}</p>
                <p className="text-[10px] text-purple-400/70 leading-relaxed">{top.reasoning}</p>
                {confidenceBar(top.confidence)}
              </div>
            );
          })()}

        {/* DOM Action log */}
        <AnimatePresence initial={false}>
          {actions.map((action, idx) => {
            const isNewest = idx === actions.length - 1;
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: isNewest ? 1 : Math.max(0.4, 1 - (actions.length - 1 - idx) * 0.07), y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                  isNewest ? "bg-white/5 border border-border/40" : "hover:bg-white/[0.02]"
                } ${!action.success ? "border-red-500/20 bg-red-950/10" : ""}`}
              >
                {/* Icon */}
                <div className={`mt-0.5 shrink-0 ${
                  !action.success ? "text-red-400" :
                  isNewest ? "text-blue-400" : "text-zinc-600"
                }`}>
                  {!action.success
                    ? <AlertTriangle className="h-3.5 w-3.5" />
                    : actionIcon(action.actionType)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <span className={`leading-snug ${isNewest ? "text-zinc-200" : "text-zinc-500"}`}>
                    {actionLabel(action)}
                  </span>
                  {action.errorMessage && (
                    <p className="mt-0.5 text-[10px] text-red-400">{action.errorMessage}</p>
                  )}
                </div>

                {/* Timestamp */}
                <span className="ml-auto shrink-0 text-[10px] text-zinc-700 tabular-nums">
                  {new Date(action.createdAt).toLocaleTimeString([], { hour12: false })}
                </span>

                {/* Success check */}
                {action.success && isNewest && (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500/70" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {actions.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-zinc-600">
            <p className="text-xs">No actions recorded yet.</p>
            <p className="text-[10px]">DOM actions will stream in as the agent executes.</p>
          </div>
        )}

        <div ref={logEndRef} />
      </div>
    </div>
  );
}
