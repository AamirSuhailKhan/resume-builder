"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MessageSquare,
  Briefcase,
  FileText,
  Award,
  TrendingUp,
  Brain,
  Sparkles,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  Lock,
  Heart,
  ChevronRight
} from "lucide-react";
import type { MomentumTask, MoodState } from "@/types/momentum";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Map icon strings to Lucide components
const IconMap: Record<string, React.ComponentType<any>> = {
  Calendar,
  MessageSquare,
  Briefcase,
  FileText,
  Award,
  TrendingUp,
  Brain,
  Sparkles,
};

export function WeeklyMomentumCard() {
  const [mood, setMood] = useState<MoodState>(null);
  const [salaryBenchmarkViewed, setSalaryBenchmarkViewed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // 1. Sync mood state from localStorage key 'careerOS_mood'
  useEffect(() => {
    const checkMood = () => {
      if (typeof window !== "undefined") {
        const savedMood = localStorage.getItem("careerOS_mood") as MoodState;
        setMood(savedMood);

        const viewed = sessionStorage.getItem("careerOS_salary_benchmark_viewed") === "true";
        setSalaryBenchmarkViewed(viewed);
      }
    };

    checkMood();

    // Set up window storage event listener to stay in sync
    window.addEventListener("storage", checkMood);
    
    // Set up a periodic check in case of state updates in same window
    const interval = setInterval(checkMood, 800);

    return () => {
      window.removeEventListener("storage", checkMood);
      clearInterval(interval);
    };
  }, []);

  // 2. Fetch Momentum Tasks via SWR
  const { data, error, isLoading, mutate } = useSWR<{ tasks: MomentumTask[] }>(
    `/api/v1/dashboard/momentum-tasks?salaryBenchmarkViewed=${salaryBenchmarkViewed}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // 3. Process tasks based on the active mood state
  const processedTasks = useMemo(() => {
    if (!data?.tasks) return [];
    const list = [...data.tasks];

    // Mood A: anxious or tired -> Show max 1 task.
    // "One thing only. You've got this."
    // Prefer lowest-friction tasks (type === 'salary', 'resume', 'skill_gap', 'fallback')
    if (mood === "anxious" || mood === "tired") {
      const lowFriction = list.filter((t) =>
        t && ["salary", "resume", "skill_gap", "fallback"].includes(t.type)
      );
      const firstLow = lowFriction[0];
      if (firstLow) {
        return [firstLow];
      }
      const first = list[0];
      return first ? [first] : [];
    }

    // Mood B: calm -> Show max 2 tasks, including one reflective task
    if (mood === "calm") {
      const mainTask = list[0];
      const reflectiveTask: MomentumTask = {
        id: "reflective-task",
        text: "Review this week's progress",
        priority: "normal",
        link: "/analytics",
        icon: "TrendingUp",
        type: "fallback",
      };

      if (!mainTask) {
        return [reflectiveTask];
      }

      return [mainTask, reflectiveTask];
    }

    // Mood C: focused (or default) -> Show max 3 tasks
    return list.slice(0, 3).filter((t): t is MomentumTask => !!t);
  }, [data, mood]);

  // Determine highest priority task for Focused mood highlight
  const highestPriorityTaskId = useMemo(() => {
    if (mood !== "focused" || processedTasks.length === 0) return null;
    const urgentTask = processedTasks.find((t) => t && t.priority === "urgent");
    if (urgentTask) return urgentTask.id;
    return processedTasks[0]?.id || null; // Default highlight the first task
  }, [processedTasks, mood]);

  // 4. Handle refreshing with 1s cooldown
  const handleRefresh = async () => {
    if (cooldown || isRefreshing) return;

    setIsRefreshing(true);
    setCooldown(true);

    try {
      await mutate(
        async () => {
          const res = await fetch(
            `/api/v1/dashboard/momentum-tasks?refresh=true&salaryBenchmarkViewed=${salaryBenchmarkViewed}`
          );
          return res.json();
        },
        { revalidate: true }
      );
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      setIsRefreshing(false);
      // 1-second cooling off period
      setTimeout(() => {
        setCooldown(false);
      }, 1000);
    }
  };

  // Rendering Loading Skeleton (3 lines, animated pulse)
  if (isLoading || isRefreshing) {
    return (
      <div className="border border-border bg-[#0b0d13] p-6 space-y-4 font-mono w-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Personalized Momentum Tasks
          </span>
          <div className="h-6 w-6 rounded bg-border animate-pulse" />
        </div>
        <div className="space-y-4 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 rounded bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-2 mt-1">
                <div className="h-3.5 bg-muted/60 rounded w-3/4" />
                <div className="h-2 bg-muted/40 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Rendering Empty State
  if (error || processedTasks.length === 0) {
    return (
      <div className="border border-border bg-[#0b0d13] p-6 space-y-6 font-mono w-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 bg-[#0e1117] border-l border-b border-border px-3 py-1 text-[8px] uppercase tracking-widest font-black text-muted-foreground">
          Momentum Feed
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="h-10 w-10 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground/60">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Tasks Locked</h3>
            <p className="text-[10px] text-muted-foreground max-w-[320px] leading-relaxed">
              Add your applications or career goals to see your personalized high-momentum tasks.
            </p>
          </div>
          <Link href="/applications" className="text-xs text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 group">
            Add applications to unlock your momentum tasks 
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-[#0b0d13] p-6 space-y-4 font-mono w-full relative overflow-hidden transition-all duration-300">
      
      {/* Dynamic Ambient Background Effect based on mood */}
      {mood === "anxious" && (
        <div className="absolute inset-0 bg-amber-500/[0.02] pointer-events-none transition-all duration-500" />
      )}
      {mood === "tired" && (
        <div className="absolute inset-0 bg-violet-500/[0.02] pointer-events-none transition-all duration-500" />
      )}
      {mood === "focused" && (
        <div className="absolute inset-0 bg-cyan-500/[0.02] pointer-events-none transition-all duration-500" />
      )}

      {/* Header with Title and Refresh Button */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3 relative z-10">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Your Momentum Tasks
        </span>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={cooldown || isRefreshing}
          className={`h-7 w-7 flex items-center justify-center border border-border bg-[#0e1117] transition-all duration-200 select-none ${
            cooldown || isRefreshing 
              ? "opacity-50 cursor-not-allowed text-muted-foreground" 
              : "hover:border-cyan-400 hover:text-cyan-400 text-foreground cursor-pointer"
          }`}
          title="Refresh tasks"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>

      {/* Anxious / Tired Mood wellbeing prompt wrapper */}
      {(mood === "anxious" || mood === "tired") && (
        <div className="text-[10px] text-amber-400 font-bold bg-amber-950/20 border border-amber-800/40 px-3 py-2 flex items-center gap-2 rounded-none relative z-10">
          <Heart className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span>One thing only. You&apos;ve got this.</span>
        </div>
      )}

      {/* Tasks List rendering */}
      <div className="space-y-3 pt-1 relative z-10">
        <AnimatePresence mode="popLayout">
          {processedTasks.map((task, idx) => {
            const Icon = IconMap[task.icon] || Sparkles;
            const isHighlighted = task.id === highestPriorityTaskId;
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`flex items-start gap-3.5 p-3.5 transition-all duration-300 border bg-[#0e1117] group ${
                  isHighlighted
                    ? "border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.1)] bg-cyan-950/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                {/* Custom Priority Dot indicator */}
                <div className="mt-1 shrink-0 flex items-center justify-center">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      task.priority === "urgent"
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        : "bg-muted-foreground/60"
                    }`}
                    title={task.priority === "urgent" ? "Urgent Task" : "Normal Task"}
                  />
                </div>

                {/* Task Icon wrapper */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#0b0d13] border border-border text-muted-foreground group-hover:text-cyan-400 group-hover:border-cyan-400/40 transition-colors">
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {/* Text & Action Link */}
                <div className="flex-1 space-y-1 text-left">
                  <span className="text-xs font-semibold leading-relaxed text-foreground block">
                    {task.text}
                  </span>
                  
                  <div className="flex items-center">
                    <Link
                      href={task.link}
                      className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider hover:underline flex items-center gap-0.5 group/link"
                    >
                      Resolve Task
                      <ChevronRight className="h-2.5 w-2.5 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
