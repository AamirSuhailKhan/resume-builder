"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  Smile, 
  Brain, 
  FileText, 
  CheckCircle,
  HelpCircle,
  Clock,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Heart
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Props from Server Component
interface ZenDashboardProps {
  stats: {
    totalApplications: number;
    resumeCount: number;
    hasPendingApproval: boolean;
    upcomingInterview: { id: string; company: string; role: string; updatedAt: string } | null;
    totalOffers: number;
    totalApplied: number;
  };
}

type MoodState = "focused" | "calm" | "anxious" | "tired" | null;

export function ZenDashboard({ stats }: ZenDashboardProps) {
  // 1. Emotional motivation state
  const [mood, setMood] = useState<MoodState>(null);
  
  // 2. Daily momentum checklist (loaded from local storage or set default)
  const [tasks, setTasks] = useState([
    { id: "matches", text: "Check today's fresh job matches", done: false, href: "/matches" },
    { id: "resume", text: "Audit resume metrics in Intelligence cockpit", done: false, href: "/ats" },
    { id: "tracker", text: "Update callback logs in application board", done: false, href: "/ats" }
  ]);

  useEffect(() => {
    const savedMood = localStorage.getItem("careeros_zen_mood");
    if (savedMood) setMood(savedMood as MoodState);

    const savedTasks = localStorage.getItem("careeros_zen_tasks");
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveTasks = (updated: typeof tasks) => {
    setTasks(updated);
    localStorage.setItem("careeros_zen_tasks", JSON.stringify(updated));
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks(updated);
  };

  const handleSetMood = (selected: MoodState) => {
    setMood(selected);
    if (selected) {
      localStorage.setItem("careeros_zen_mood", selected);
    } else {
      localStorage.removeItem("careeros_zen_mood");
    }
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  // 3. Primary Mission of the Day (One Primary Action Rule)
  const primaryMission = useMemo(() => {
    if (stats.resumeCount === 0) {
      return {
        title: "Create or upload your first resume snapshot",
        why: "Unlocks the ATS parser & starts scanning matching tech positions in India.",
        cta: "Create Profile Resume",
        href: "/builder",
        color: "border-violet-500 bg-violet-950/10 text-violet-400"
      };
    }
    if (stats.totalApplications === 0) {
      return {
        title: "Review top job matches for your level",
        why: "We found active roles matching your tech stack. Review fit rates before applying.",
        cta: "Scan Active Matches",
        href: "/matches",
        color: "border-cyan-500 bg-cyan-950/10 text-cyan-400"
      };
    }
    if (stats.upcomingInterview) {
      return {
        title: `Prepare for your ${stats.upcomingInterview.company} interview`,
        why: "Hiring managers check architecture decisions. Run a mock prep now.",
        cta: "Start Mock Simulator",
        href: "/interview",
        color: "border-emerald-500 bg-emerald-950/10 text-emerald-400"
      };
    }
    if (stats.hasPendingApproval) {
      return {
        title: "Review pending outreach drafts",
        why: "Your automated agent generated customized networking templates for target hiring leads.",
        cta: "Review & Dispatch Drafts",
        href: "/agents",
        color: "border-amber-500 bg-amber-950/10 text-amber-400"
      };
    }
    // Default fallback
    return {
      title: "Optimize resume metrics for target companies",
      why: "Adding quantitative results to your experience bullets can boost callback rates by 40%.",
      cta: "Run Resume Diagnostic",
      href: "/ats",
      color: "border-cyan-500 bg-cyan-950/10 text-cyan-400"
    };
  }, [stats]);

  // Support messages for wellbeing check-in
  const moodGreetings: Record<NonNullable<MoodState>, string> = {
    focused: "Superb. Let's block out the noise and work on your single most high-leverage step today.",
    calm: "Excellent. Steady progress beats frantic application bursts every single time. Breathe.",
    anxious: "That is completely normal. The search is a marathon, not a sprint. Just focus on one tiny checklist step today.",
    tired: "Rest is part of the work. If you need to step away after ticking off today's primary action, do it."
  };

  return (
    <div className="space-y-8 font-mono max-w-[900px] mx-auto text-left">
      
      {/* 1. ZEN HEADER GREETING */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">
              WELCOME BACK
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Focus on today&apos;s single high-leverage action. Avoid the application clutter.
            </p>
          </div>

          {/* Quick Wellbeing Check-in */}
          <div className="flex items-center gap-2 bg-[#0e1117] border border-border px-3 py-1.5 rounded-none">
            <span className="text-[9px] text-muted-foreground uppercase font-bold mr-1 flex items-center gap-1">
              <Heart className="h-3 w-3 text-red-500 fill-red-500" /> State Check:
            </span>
            <div className="flex gap-1">
              {(["calm", "focused", "anxious", "tired"] as MoodState[]).map(m => (
                <button
                  key={m}
                  onClick={() => handleSetMood(m)}
                  className={`text-[9px] px-2 py-0.5 border capitalize transition-all ${
                    mood === m
                      ? "border-cyan-400 bg-cyan-950/20 text-cyan-400 font-bold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic support caption based on check-in */}
        {mood && (
          <motion.p
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-cyan-400 font-semibold mt-2.5 leading-normal"
          >
            {moodGreetings[mood]}
          </motion.p>
        )}
      </div>

      {/* 2. THE ONE PRIMARY ACTION (Mission Card) */}
      <div className={`border p-6 relative overflow-hidden ${primaryMission.color}`}>
        <div className="absolute top-0 right-0 bg-[#0b0d13] border-l border-b border-border px-3 py-1 text-[8px] uppercase tracking-widest font-black text-muted-foreground">
          Primary Mission
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-base font-bold text-foreground leading-snug">
              {primaryMission.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground uppercase tracking-widest text-[9px] block mb-1">Why it matters:</strong>
              {primaryMission.why}
            </p>
          </div>

          <Link href={primaryMission.href} className="inline-block pt-1">
            <Button className="h-10 rounded-none bg-foreground text-background font-bold text-xs uppercase px-5 hover:opacity-95 flex items-center gap-2">
              {primaryMission.cta} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. MOMENTUM TRACK & STATS FUNNEL */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr]">
        
        {/* Daily Tasks Checklist */}
        <div className="border border-border bg-[#0b0d13] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              DAILY MOMENTUM CHECKLIST
            </span>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/20 border border-cyan-800 px-2 py-0.5">
              {completedCount}/{tasks.length} DONE ({progressPercent}%)
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className="flex items-start gap-3 cursor-pointer group text-xs select-none"
              >
                {task.done ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                )}
                <div className="flex-1 space-y-1">
                  <span className={`leading-relaxed ${task.done ? "line-through text-muted-foreground" : "text-foreground font-semibold"}`}>
                    {task.text}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={task.href}
                      onClick={e => e.stopPropagation()}
                      className="text-[9px] text-cyan-500 hover:underline flex items-center gap-0.5"
                    >
                      Open Module <ExternalLink className="h-2 w-2" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimal Pipeline Status Funnel */}
        <div className="border border-border bg-[#0b0d13] p-6 space-y-4">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider block border-b border-border/40 pb-3">
            JOB SEARCH PIPELINE STATUS
          </span>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="border border-border bg-[#0e1117] p-3 text-left">
              <span className="text-[9px] text-muted-foreground uppercase">Resumes Active</span>
              <div className="text-xl font-bold text-foreground mt-1">{stats.resumeCount}</div>
            </div>
            <div className="border border-border bg-[#0e1117] p-3 text-left">
              <span className="text-[9px] text-muted-foreground uppercase">Applied (Dispatches)</span>
              <div className="text-xl font-bold text-foreground mt-1">{stats.totalApplied}</div>
            </div>
            <div className="border border-border bg-[#0e1117] p-3 text-left">
              <span className="text-[9px] text-muted-foreground uppercase">Interviews Scheduled</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{stats.totalApplied > 0 ? (stats.upcomingInterview ? 1 : 0) : 0}</div>
            </div>
            <div className="border border-border bg-[#0e1117] p-3 text-left">
              <span className="text-[9px] text-muted-foreground uppercase">Offers Secured</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">{stats.totalOffers}</div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. PREPARATION READINESS STATS */}
      <div className="border border-border bg-[#0b0d13] p-6 space-y-4">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider block border-b border-border/40 pb-3">
          READINESS INTEGRITY OVERVIEW
        </span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div className="flex items-start gap-3 bg-[#0e1117] p-3.5 border border-border">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-cyan-950/20 border border-cyan-800 text-cyan-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">Resume Score Integrity</span>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                {stats.resumeCount > 0 
                  ? "Standard tags parsed successfully. Needs metric checks for target startups."
                  : "No resume found. Upload to analyze compliance."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#0e1117] p-3.5 border border-border">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-emerald-950/20 border border-emerald-800 text-emerald-400">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-foreground block">Interview Readiness Index</span>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                {stats.upcomingInterview
                  ? `Upcoming interview at ${stats.upcomingInterview.company}. Custom mock workspace created.`
                  : "Mock interview practice recommended for SDE-2 structures."}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
