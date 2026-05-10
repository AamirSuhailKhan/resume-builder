"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, PlayCircle, Bot } from "lucide-react";

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

  useEffect(() => {
    if (simulateDemo && feed.length === 0) {
      setFeed(DEMO_EVENTS);

      const timer = setTimeout(() => {
        setFeed((prev) => [
          ...prev.filter(e => e.id !== "3"),
          { ...DEMO_EVENTS[2], status: "completed" } as ActivityEvent,
          {
            id: "4",
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            agent: "Approval Engine",
            message: "Review generated cover letter before final submission.",
            status: "approval",
            reasoning: "Policy requires human approval for unverified salary field.",
          }
        ]);
      }, 5000);

      return () => clearTimeout(timer);
      let eventSource: EventSource | null = null;
      let retryCount = 0;
      let reconnectTimeout: NodeJS.Timeout;

      const connect = () => {
        eventSource = new EventSource("/api/v1/events/stream");

        eventSource.onopen = () => {
          retryCount = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "heartbeat" || data.type === "connected") return;
            
            setFeed((prev) => {
              // Keep last 50 events to prevent memory bloat
              const newFeed = [data as ActivityEvent, ...prev].slice(0, 50);
              return newFeed;
            });
          } catch (err) {
            console.error("Failed to parse SSE message", err);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error", error);
          eventSource?.close();
          
          // Exponential backoff
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          
          if (retryCount < 10) {
            reconnectTimeout = setTimeout(connect, timeout);
          } else {
            console.error("SSE max retries reached. Stopping reconnection.");
          }
        };
      };

      connect();

      return () => {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (eventSource) eventSource.close();
      };
    }
    return undefined;
  }, [events, simulateDemo, feed.length]);

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
          {feed.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              layout
              className="flex gap-3 relative"
            >
              <div className="flex flex-col items-center pt-1">
                {event.status === "running" && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                {event.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {event.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                {event.status === "approval" && <PlayCircle className="h-4 w-4 text-amber-500 animate-pulse" />}
                <div className="w-[1px] h-full bg-border mt-2" />
              </div>
              
              <div className="flex flex-col flex-1 pb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-muted-foreground text-xs opacity-60">[{event.timestamp}]</span>
                  <span className="text-white font-medium tracking-tight">{event.agent}</span>
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
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
