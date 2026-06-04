"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Sparkles,
  Brain,
  Award,
  Briefcase,
  Calendar,
  Users,
  CheckCircle2,
  Target,
  ShieldCheck,
  DollarSign,
  Activity,
  ChevronRight,
  ArrowUpRight,
  Zap,
  Clock,
  Compass,
  Heart,
  LineChart as LineIcon,
  RefreshCw,
  Info,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MissionControlDashboardData } from "@/lib/services/dashboard.service";
import { CareerHealthData, CareerHealthDetails } from "@/lib/services/career-health.service";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface CareerMissionControlProps {
  data: MissionControlDashboardData;
  initialHistory: CareerHealthData[];
}

export function CareerMissionControl({ data, initialHistory }: CareerMissionControlProps) {
  const [greeting, setGreeting] = useState("Good Evening");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"control" | "health">("control");
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<CareerHealthData[]>(initialHistory);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [selectedSubscore, setSelectedSubscore] = useState<
    "skill" | "interview" | "networking" | "application" | "market"
  >("skill");

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const {
    user,
    careerProfile,
    careerTwin,
    readinessScore,
    successProbability,
    skillGaps,
    weeklyActionPlan,
    recommendedOpportunities,
    recruiterActivity,
    progress,
  } = data;

  const currentHealth = history[history.length - 1] || {
    overallScore: (careerTwin?.scores as any)?.health ?? 0,
    skillHealth: 0,
    interviewHealth: 0,
    networkingHealth: 0,
    applicationHealth: 0,
    marketHealth: 0,
    details: {
      skill: { value: 0, why: "No skill health calculated yet.", hurts: "Please upload your resume to start analysis.", improve: "Upload resume to complete initialization." },
      interview: { value: 0, why: "No interview mock runs tracked yet.", hurts: "Simulated interview logs are empty.", improve: "Start a mock interview session." },
      networking: { value: 0, why: "No professional network metrics yet.", hurts: "Network contact count is zero.", improve: "Add network contacts to start analytics." },
      application: { value: 0, why: "No application analytics calculated yet.", hurts: "Tracked job application count is zero.", improve: "Add job applications to the tracker." },
      market: { value: 0, why: "No salary projections or market indicators yet.", hurts: "No active career goals defined.", improve: "Define target roles to calculate market health." },
    },
    createdAt: new Date(),
  };

  // Formats currency numbers into readable layout
  const formatSalary = (val: any) => {
    if (!val) return "—";
    const num = Number(val);
    if (isNaN(num)) return val;
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)} LPA`;
    return `₹${num.toLocaleString()}`;
  };

  // Trigger recalculation of Career Health Engine
  const recalculateHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/career-health", { method: "POST" });
      if (res.ok) {
        const fresh = await res.json();
        // Update local history array
        setHistory((prev) => [...prev, fresh]);
      }
    } catch (e) {
      console.error("Recalculation failed", e);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Custom tooltips for Recharts
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            {mounted && label ? new Date(label).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
          </p>
          <div className="space-y-1">
            {payload.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-medium text-slate-300">{p.name}:</span>
                <span className="font-extrabold text-white">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Derive target goal headline
  const targetRoles = careerProfile?.goals?.targetRoles as string[] | undefined;
  const careerGoal = targetRoles && targetRoles.length > 0 ? targetRoles[0] : "Backend Engineer";

  // Active explanations selection helper
  const detailsSource = currentHealth.details as any as CareerHealthDetails;
  const activeExplanation = detailsSource[selectedSubscore] || {
    value: 70,
    why: "Evaluates your matching parameters.",
    hurts: "Lacking telemetry logs in this category.",
    improve: "Engage with core platform exercises.",
  };

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto pb-16 text-left">
      {/* ── HEADER TABS SELECTORS ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("control")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-extrabold rounded-xl border transition-all ${
              activeTab === "control"
                ? "bg-indigo-950 text-indigo-200 border-indigo-500/40 shadow-md shadow-indigo-950/20"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-800"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Mission Control Room</span>
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-extrabold rounded-xl border transition-all ${
              activeTab === "health"
                ? "bg-rose-950 text-rose-200 border-rose-500/40 shadow-md shadow-rose-950/20"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-800"
            }`}
          >
            <Heart className="h-4 w-4" />
            <span>Career Health Diagnostics</span>
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
              {currentHealth.overallScore}
            </span>
          </button>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-900">
          Last Synchronized: {mounted ? (currentHealth.createdAt ? new Date(currentHealth.createdAt).toLocaleTimeString() : "") : ""}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "control" ? (
          <motion.div
            key="control-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* ── HERO SECTION ── */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 shadow-2xl">
              {/* Decorative background glow blobs */}
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

              <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                {/* Greeting and Career Goal */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-300">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    <span>CareerOS Mission Control</span>
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                    {greeting}, <span className="text-indigo-400">{user.name || "Alex"}</span>
                  </h1>
                  <p className="text-slate-300 text-sm max-w-md font-medium">
                    Your autonomous twin is actively scanning roles, analyzing skill gaps, and drafting outreach plans.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Target Goal:</span>
                    <span className="bg-indigo-950/60 text-indigo-200 border border-indigo-500/30 px-3 py-1 rounded-xl text-xs font-black tracking-wide shadow-sm flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-indigo-400" />
                      {careerGoal}
                    </span>
                  </div>
                </div>

                {/* Three Primary Orchestration Scores */}
                <div className="lg:col-span-7 grid grid-cols-3 gap-4 md:gap-6 bg-slate-900/50 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-slate-800">
                  {/* 1. Current Readiness */}
                  <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-indigo-500/30 transition-colors">
                    <div className="relative flex items-center justify-center h-14 w-14 md:h-16 md:w-16">
                      <svg className="absolute w-full h-full transform -rotate-95">
                        <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="4" fill="none" />
                        <circle cx="28" cy="28" r="24" className="stroke-indigo-500" strokeWidth="4.5" fill="none"
                          strokeDasharray={2 * Math.PI * 24}
                          strokeDashoffset={2 * Math.PI * 24 * (1 - (readinessScore?.overallScore ?? 71) / 100)}
                          strokeLinecap="round" />
                      </svg>
                      <span className="text-sm md:text-base font-black text-white">{readinessScore?.overallScore ?? 71}%</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-3 uppercase tracking-wider">Current Readiness</span>
                  </div>

                  {/* 2. Career Health Score */}
                  <button
                    onClick={() => setActiveTab("health")}
                    className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="relative flex items-center justify-center h-14 w-14 md:h-16 md:w-16">
                      <svg className="absolute w-full h-full transform -rotate-95">
                        <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="4" fill="none" />
                        <circle cx="28" cy="28" r="24" className="stroke-emerald-500" strokeWidth="4.5" fill="none"
                          strokeDasharray={2 * Math.PI * 24}
                          strokeDashoffset={2 * Math.PI * 24 * (1 - currentHealth.overallScore / 100)}
                          strokeLinecap="round" />
                      </svg>
                      <span className="text-sm md:text-base font-black text-white">{currentHealth.overallScore}</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-3 uppercase tracking-wider">Career Health</span>
                  </button>

                  {/* 3. Success Probability */}
                  <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-violet-500/30 transition-colors">
                    <div className="relative flex items-center justify-center h-14 w-14 md:h-16 md:w-16">
                      <svg className="absolute w-full h-full transform -rotate-95">
                        <circle cx="28" cy="28" r="24" className="stroke-slate-800" strokeWidth="4" fill="none" />
                        <circle cx="28" cy="28" r="24" className="stroke-violet-500" strokeWidth="4.5" fill="none"
                          strokeDasharray={2 * Math.PI * 24}
                          strokeDashoffset={2 * Math.PI * 24 * (1 - successProbability)}
                          strokeLinecap="round" />
                      </svg>
                      <span className="text-sm md:text-base font-black text-white">{Math.round(successProbability * 100)}%</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-3 uppercase tracking-wider">Success Prob.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TWO-COLUMN MAIN CONTROL INTERFACE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Action Center */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-950 border border-indigo-800/40 rounded-xl text-indigo-400">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Weekly Action Plan</h2>
                      <p className="text-xs text-slate-400">Perform these high-impact steps to boost success probabilities</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {weeklyActionPlan.length === 0 ? (
                    <Card className="border border-dashed border-slate-800 bg-slate-900/10 p-8 text-center rounded-2xl">
                      <CardContent className="flex flex-col items-center justify-center space-y-4 p-0">
                        <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">All caught up!</p>
                          <p className="text-xs text-slate-400">Your Action Center has no pending tasks.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    weeklyActionPlan.map((action, index) => {
                      let badgeColor = "bg-rose-950/60 text-rose-300 border-rose-800/30";
                      if (index === 1 || index === 2) badgeColor = "bg-amber-950/60 text-amber-300 border-amber-800/30";
                      else if (index > 2) badgeColor = "bg-emerald-950/60 text-emerald-300 border-emerald-800/30";

                      return (
                        <motion.div
                          key={action.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onMouseEnter={() => setActiveActionId(action.id)}
                          onMouseLeave={() => setActiveActionId(null)}
                          className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                            activeActionId === action.id
                              ? "bg-slate-900/60 border-indigo-500/40 shadow-lg shadow-indigo-950/20 translate-x-1"
                              : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-black text-sm">
                              {index + 1}
                            </div>
                          </div>
                          
                          <div className="flex-grow space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                {action.category || "TASK"}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Priority {10 - index}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white leading-snug">
                              {action.title}
                            </h4>
                            <p className="text-xs text-slate-400 leading-normal max-w-xl">
                              {action.description}
                            </p>
                          </div>

                          <Link href={action.actionUrl || "#"} className="flex-shrink-0 self-center">
                            <div className="h-8 w-8 rounded-full bg-slate-900/80 border border-slate-800 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center text-slate-400">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Intelligence Center */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-950 border border-violet-800/40 rounded-xl text-violet-400">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Intelligence Center</h2>
                      <p className="text-xs text-slate-400">Active telemetry on market, compensation, and networks</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Salary & Market */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Salary Potential</span>
                        <span className="text-emerald-400 font-bold text-[9px] bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded-full">
                          +77% Growth
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Current</span>
                            <span className="text-xs font-semibold text-slate-400">
                              {formatSalary(careerTwin?.salaryProjection?.current ?? 1800000)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-indigo-400 font-bold block">Target</span>
                            <span className="text-base font-black text-white">
                              {formatSalary(careerTwin?.salaryProjection?.projected ?? 3200000)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full" style={{ width: "70%" }} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Market Demand</span>
                        <span className="text-indigo-400 font-bold text-[9px] flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> High
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-black text-white">8.4<span className="text-xs text-slate-400 font-normal">/10</span></span>
                          <span className="text-[9px] text-slate-400 font-semibold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                            +14% MoM
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-tight">
                          Backend systems engineering experiences massive outbound scaling signals.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Skill gaps */}
                  <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Critical Skill Gaps</span>
                      <span className="text-[10px] text-slate-500 font-semibold">5 gaps identified</span>
                    </div>
                    <div className="space-y-3">
                      {skillGaps.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No skill gaps analyzed yet.</p>
                      ) : (
                        skillGaps.slice(0, 3).map((gap, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-300 font-semibold">{gap.name}</span>
                              <span className="text-indigo-400 text-[10px] font-bold">Demand: {gap.demand}/10</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full rounded-full"
                                style={{ width: `${gap.demand * 10}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="pt-1 text-center">
                      <Link href="/career-graph" className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">
                        View Skills Matrix <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Recruiter Activity */}
                  <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Recruiter Activity</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full">
                        3 Active channels
                      </span>
                    </div>
                    <div className="space-y-3">
                      {recruiterActivity.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No recruiter activity logged yet.</p>
                      ) : (
                        recruiterActivity.map((recruiter) => {
                          const status = recruiter.latestInteraction?.status || "SENT";
                          let badgeClass = "bg-slate-900 text-slate-400 border-slate-800";
                          if (status === "REPLIED") badgeClass = "bg-emerald-950/60 text-emerald-300 border-emerald-800/40";
                          else if (status === "GHOSTED") badgeClass = "bg-rose-950/60 text-rose-300 border-rose-800/40";

                          return (
                            <div key={recruiter.id} className="flex justify-between items-start gap-3 text-xs bg-slate-900/30 p-2.5 rounded-xl border border-slate-900 hover:border-slate-800 transition-all">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{recruiter.name}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">@{recruiter.companyName}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">
                                  &quot;{recruiter.latestInteraction?.notes || "Sent outreach note."}&quot;
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                  {status}
                                </span>
                                <span className="text-[9px] text-slate-500 block font-bold">
                                  Score: {Math.round(recruiter.responseScore)}%
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PROGRESS CENTER & RECOMMENDED OPPORTUNITIES ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Progress Center */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-950 border border-emerald-800/40 rounded-xl text-emerald-400">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Search Progress Center</h2>
                    <p className="text-xs text-slate-400">Aggregated application stats and network pipeline logs</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950/40 border border-slate-800 hover:border-indigo-500/20 p-4 rounded-2xl space-y-2 group transition-all duration-300">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Applications</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{progress.applications}</span>
                      <span className="text-emerald-400 text-xs font-bold">+2 new</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full group-hover:bg-indigo-400 transition-colors" style={{ width: "65%" }} />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 hover:border-emerald-500/20 p-4 rounded-2xl space-y-2 group transition-all duration-300">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Completed Mocks</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{progress.interviews}</span>
                      <span className="text-slate-400 text-xs font-semibold">Streak: 5d</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full group-hover:bg-emerald-400 transition-colors" style={{ width: "45%" }} />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 hover:border-rose-500/20 p-4 rounded-2xl space-y-2 group transition-all duration-300">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Offers Secured</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{progress.offers}</span>
                      <span className="text-rose-400 text-xs font-bold">1 negotiation</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full group-hover:bg-rose-400 transition-colors" style={{ width: "20%" }} />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 hover:border-amber-500/20 p-4 rounded-2xl space-y-2 group transition-all duration-300">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Networking</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{progress.networking}</span>
                      <span className="text-amber-400 text-xs font-bold">2 referrers</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full group-hover:bg-amber-400 transition-colors" style={{ width: "80%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Opportunities */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-950 border border-amber-800/40 rounded-xl text-amber-400">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Recommended Opportunities</h2>
                    <p className="text-xs text-slate-400">Verified openings matching your stack fit score</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {recommendedOpportunities.length === 0 ? (
                    <Card className="border border-dashed border-slate-800 bg-slate-900/10 p-6 text-center rounded-2xl">
                      <p className="text-xs text-slate-500">No opportunities recommended yet.</p>
                    </Card>
                  ) : (
                    recommendedOpportunities.map((opportunity) => (
                      <div key={opportunity.id} className="bg-slate-950/40 border border-slate-800 hover:border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all group">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">{opportunity.role}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-indigo-400">{opportunity.company}</span>
                            <span>•</span>
                            <span>{opportunity.location || "Remote"}</span>
                            <span>•</span>
                            <span className="text-[10px] text-slate-500">{opportunity.salaryRange || "Not listed"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-900/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {opportunity.matchScore}% Match
                          </span>
                          <Link href={`/opportunities`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-indigo-600 hover:text-white transition-all">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </div>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="health-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* ── HEALTH DIAGNOSTICS HERO SECTION ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />

              <div className="lg:col-span-4 space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-950/40 px-3 py-1 text-xs font-semibold text-rose-300">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  <span>Real-Time Health Engine</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">Career Health Diagnostics</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Calculates overall health based on active resume ATS evaluations, coding mock frequencies, recruiter reply telemetry, and skill alignments.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={recalculateHealth}
                    disabled={loadingHealth}
                    className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase px-5 flex items-center gap-2 shadow-lg shadow-rose-950/30"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingHealth ? "animate-spin" : ""}`} />
                    {loadingHealth ? "Recalculating..." : "Recalculate Health Engine"}
                  </Button>
                </div>
              </div>

              {/* Dynamic Overall Score Radial */}
              <div className="lg:col-span-3 flex justify-center py-4 border-slate-800/80 lg:border-r lg:border-l">
                <div className="text-center space-y-2">
                  <div className="relative flex items-center justify-center h-32 w-32">
                    <svg className="absolute w-full h-full transform -rotate-95">
                      <circle cx="64" cy="64" r="56" className="stroke-slate-900" strokeWidth="8" fill="none" />
                      <circle cx="64" cy="64" r="56" className="stroke-rose-500" strokeWidth="9" fill="none"
                        strokeDasharray={2 * Math.PI * 56}
                        strokeDashoffset={2 * Math.PI * 56 * (1 - currentHealth.overallScore / 100)}
                        strokeLinecap="round" />
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-black text-white">{currentHealth.overallScore}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Health Index</span>
                    </div>
                  </div>
                  <p className="text-xs text-rose-400 font-bold tracking-tight">Overall Rating: Strong</p>
                </div>
              </div>

              {/* Quick Health Status Funnel */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Health Subscore Summary</span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSelectedSubscore("skill")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedSubscore === "skill" ? "bg-purple-950/30 border-purple-500/50" : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">Skill</span>
                      <span className="text-purple-400 font-extrabold">{currentHealth.skillHealth}</span>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedSubscore("interview")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedSubscore === "interview" ? "bg-blue-950/30 border-blue-500/50" : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">Interview</span>
                      <span className="text-blue-400 font-extrabold">{currentHealth.interviewHealth}</span>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedSubscore("networking")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedSubscore === "networking" ? "bg-yellow-950/30 border-yellow-500/50" : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">Networking</span>
                      <span className="text-yellow-400 font-extrabold">{currentHealth.networkingHealth}</span>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedSubscore("application")}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedSubscore === "application" ? "bg-emerald-950/30 border-emerald-500/50" : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">Application</span>
                      <span className="text-emerald-400 font-extrabold">{currentHealth.applicationHealth}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── HISTORICAL TREND CHART ── */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-950 border border-rose-800/40 rounded-xl text-rose-400">
                    <LineIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Historical Health Trends</h3>
                    <p className="text-xs text-slate-400">Daily trajectory of overall health index and subscores</p>
                  </div>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-72 w-full pt-4">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="createdAt"
                        stroke="#64748b"
                        fontSize={10}
                        fontWeight="bold"
                        tickFormatter={(str) => {
                          try {
                            return new Date(str).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                          } catch (e) {
                            return "";
                          }
                        }}
                      />
                      <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" domain={[30, 100]} />
                      <Tooltip content={renderCustomTooltip} />
                      <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "10px" }} />
                      <Line
                        name="Overall Health"
                        type="monotone"
                        dataKey="overallScore"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        name="Skill Health"
                        type="monotone"
                        dataKey="skillHealth"
                        stroke="#a855f7"
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
                      />
                      <Line
                        name="Interview Health"
                        type="monotone"
                        dataKey="interviewHealth"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
                      />
                      <Line
                        name="Networking Health"
                        type="monotone"
                        dataKey="networkingHealth"
                        stroke="#eab308"
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
                      />
                      <Line
                        name="Application Health"
                        type="monotone"
                        dataKey="applicationHealth"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-slate-900/30 rounded-2xl animate-pulse" />
                )}
              </div>
            </div>

            {/* ── SUBSCORE DIAGNOSTICS & EXPLANATIONS PANEL ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Interactive Subscore Cards */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Diagnostics Diagnostics</span>
                
                <div className="space-y-3">
                  {[
                    { id: "skill", label: "Skill Health Score", val: currentHealth.skillHealth, color: "text-purple-400 border-purple-500/20 bg-purple-950/10" },
                    { id: "interview", label: "Interview Health Score", val: currentHealth.interviewHealth, color: "text-blue-400 border-blue-500/20 bg-blue-950/10" },
                    { id: "networking", label: "Networking Health Score", val: currentHealth.networkingHealth, color: "text-yellow-400 border-yellow-500/20 bg-yellow-950/10" },
                    { id: "application", label: "Application Health Score", val: currentHealth.applicationHealth, color: "text-emerald-400 border-emerald-500/20 bg-emerald-950/10" },
                    { id: "market", label: "Market Health Score", val: currentHealth.marketHealth, color: "text-rose-400 border-rose-500/20 bg-rose-950/10" },
                  ].map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubscore(sub.id as any)}
                      className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                        selectedSubscore === sub.id
                          ? "bg-slate-900/80 border-rose-500/40 shadow-lg translate-x-1"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${sub.id === "skill" ? "bg-purple-400" : sub.id === "interview" ? "bg-blue-400" : sub.id === "networking" ? "bg-yellow-400" : sub.id === "application" ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <span className="text-sm font-semibold text-white">{sub.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">{sub.val}</span>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Dynamic Explanation Widget */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider bg-rose-950/60 text-rose-300 border border-rose-800/40 px-3 py-1 rounded-full">
                      {selectedSubscore} Analysis
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">{activeExplanation.value}</span>
                    <span className="text-xs text-slate-500 font-bold block">Telemetry Score</span>
                  </div>
                </div>

                <div className="space-y-6 text-xs leading-relaxed">
                  {/* 1. Why it exists */}
                  <div className="flex gap-4 items-start bg-slate-900/30 p-4 rounded-2xl border border-slate-900">
                    <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl mt-0.5 flex-shrink-0">
                      <Info className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Why this score exists</h4>
                      <p className="text-slate-300 font-medium leading-normal">{activeExplanation.why}</p>
                    </div>
                  </div>

                  {/* 2. What hurts the score */}
                  <div className="flex gap-4 items-start bg-slate-900/30 p-4 rounded-2xl border border-slate-900">
                    <div className="p-2 bg-rose-950/60 text-rose-300 rounded-xl mt-0.5 flex-shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">What hurts the rating</h4>
                      <p className="text-slate-300 font-medium leading-normal">{activeExplanation.hurts}</p>
                    </div>
                  </div>

                  {/* 3. How to improve it */}
                  <div className="flex gap-4 items-start bg-emerald-950/10 p-4 rounded-2xl border border-emerald-950/30">
                    <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl mt-0.5 flex-shrink-0">
                      <Lightbulb className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">How to improve the rating</h4>
                      <p className="text-slate-300 font-semibold leading-normal">{activeExplanation.improve}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
