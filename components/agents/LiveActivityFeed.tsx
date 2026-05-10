"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, PlayCircle, Bot } from "lucide-react";
import { useEventSource } from "@/hooks/useEventSource";

export type ActivityEvent = {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  status: "running" | "completed" | "error" | "approval";
  reasoning?: string;
  metrics?: string;
};

interface LiveActivityFeedProps {
  events?: ActivityEvent[];
  simulateDemo?: boolean;
}

const DEMO_EVENTS: ActivityEvent[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 30000).toLocaleTimeString([], { hour12: false }),
    agent: "Resume Optimizer Agent",
    message: "Analyzing ATS keyword coverage...",
    status: "completed",
    metrics: "Keywords matched: 42/50",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 20000).toLocaleTimeString([], { hour12: false }),
    agent: "Job Match Agent",
    message: "Found 42 matching jobs across 3 sources.",
    status: "completed",
    reasoning: "Filtered out 14 ghost jobs based on age > 30 days and low employer response probability.",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 10000).toLocaleTimeString([], { hour12: false }),
    agent: "Auto Apply Agent",
    message: "Opening Greenhouse workflow for Senior SWE, Acme Corp...",
    status: "running",
  },
];

export function LiveActivityFeed({ events = [], simulateDemo = false }: LiveActivityFeedProps) {
  const [feed, setFeed] = useState<ActivityEvent[]>(events);

  const streamUrl = simulateDemo ? null : "/api/v1/events/stream";
  
  // Connect to SSE using robust shared hook
  useEventSource(streamUrl, {
    autoReconnect: true,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat" || data.type === "connected") return;
        
        setFeed((prev) => {
          const newFeed = [data as ActivityEvent, ...prev].slice(0, 50);
          return newFeed;
        });
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    }
  });

  // Isolated Demo Mode Logic
  useEffect(() => {
    if (!simulateDemo) return;
    
    if (feed.length === 0) {
      setFeed(DEMO_EVENTS);
    }

    const timer = setTimeout(() => {
      setFeed((prev) => {
        // Prevent duplicate completions if already triggered
        if (prev.some(e => e.id === "4")) return prev;
        
        return [
          {
            id: "4",
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            agent: "Approval Engine",
            message: "Review generated cover letter before final submission.",
            status: "approval",
            reasoning: "Policy requires human approval for unverified salary field.",
          },
          { ...DEMO_EVENTS[2], status: "completed" } as ActivityEvent,
          ...prev.filter(e => e.id !== "3")
        ];
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [simulateDemo]);

  return (
    <div className="w-full h-full rounded-xl border border-border bg-black/95 text-green-500 overflow-hidden font-mono text-sm flex flex-col shadow-2xl relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-black/50 backdrop-blur">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Bot className="h-4 w-4" />
          <span>System execution trace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-green-500">Live</span>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[400px]">
        <AnimatePresence initial={false}>
          {feed.map((event, index) => {
            const isNewest = index === 0;
            const opacityValue = Math.max(0.35, 1 - index * 0.15);
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, filter: "brightness(2)" }}
                animate={{ opacity: opacityValue, filter: "brightness(1)" }}
                layout="position"
                transition={{ duration: 0.3 }}
                className="flex gap-3 relative"
              >
                <div className="flex flex-col items-center pt-1">
                  {event.status === "running" && <Loader2 className={`h-4 w-4 text-blue-500 ${isNewest ? "animate-spin" : ""}`} />}
                  {event.status === "completed" && <CheckCircle2 className={`h-4 w-4 text-green-500 ${isNewest ? "drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]" : ""}`} />}
                  {event.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {event.status === "approval" && <PlayCircle className={`h-4 w-4 text-amber-500 ${isNewest ? "animate-pulse drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" : ""}`} />}
                  <div className="w-[1px] h-full bg-border mt-2" />
                </div>
                
                <div className={`flex flex-col flex-1 pb-4 transition-all duration-500 ${isNewest ? "brightness-125" : "brightness-100"}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xs ${isNewest ? "text-green-400 font-bold" : "text-muted-foreground opacity-60"}`}>[{event.timestamp}]</span>
                    <span className={`font-medium tracking-tight ${isNewest ? "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : "text-gray-300"}`}>{event.agent}</span>
                  </div>
                  <div className={`text-sm ${event.status === 'error' ? 'text-red-400' : event.status === 'approval' ? 'text-amber-400' : 'text-gray-300'}`}>
                    {event.message}
                  </div>
                  
                  {event.reasoning && (
                    <div className="mt-2 pl-3 border-l-2 border-border/50 text-xs text-gray-500 italic bg-white/5 py-1 px-2 rounded-r">
                      <span className="text-purple-400 font-semibold non-italic">Reasoning:</span> {event.reasoning}
                    </div>
                  )}
                  {event.metrics && (
                    <div className="mt-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded inline-block border border-blue-500/20">
                      {event.metrics}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
