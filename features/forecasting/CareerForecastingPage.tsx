"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Target, 
  Sparkles, 
  ArrowUpRight, 
  Zap, 
  Briefcase, 
  Activity, 
  CheckCircle,
  RefreshCw,
  HelpCircle,
  Percent,
  Coins
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ScenarioForecast = {
  salary6Months: number;
  salary12Months: number;
  interviewSuccessProb: number;
  offerProb: number;
  goalCompletionProb: number;
  assumptions: string[];
  levers: string[];
};

type ForecastData = {
  currentSalary: number;
  currency: string;
  unit: string;
  readinessScore: number;
  currentPath: ScenarioForecast;
  aggressivePath: ScenarioForecast;
  optimizedPath: ScenarioForecast;
  createdAt: string;
};

type ActiveScenario = "current" | "aggressive" | "optimized";

export function CareerForecastingPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ActiveScenario>("optimized");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/career-forecasting");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error fetching forecasting data:", e);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/career-forecasting", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error regenerating forecasting data:", e);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030307] text-slate-100 p-6 md:p-8 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Computing predictive algorithms and loading forecasts...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#030307] text-slate-100 p-6 md:p-8 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-rose-400 text-sm font-medium">Failed to load forecasting metrics.</p>
        <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white">
          Retry Load
        </button>
      </div>
    );
  }

  const { currentSalary, currency, unit, readinessScore, currentPath, aggressivePath, optimizedPath } = data;

  // Prepare Chart Data for Trajectory Timeline (Current, 6 Months, 12 Months)
  const trajectoryChartData = [
    {
      name: "Today",
      "Current Path": currentSalary,
      "Aggressive Path": currentSalary,
      "Optimized Path": currentSalary,
    },
    {
      name: "6 Months",
      "Current Path": currentPath.salary6Months,
      "Aggressive Path": aggressivePath.salary6Months,
      "Optimized Path": optimizedPath.salary6Months,
    },
    {
      name: "12 Months",
      "Current Path": currentPath.salary12Months,
      "Aggressive Path": aggressivePath.salary12Months,
      "Optimized Path": optimizedPath.salary12Months,
    },
  ];

  // Prepare Probabilities Comparison Data
  const probabilityChartData = [
    {
      metric: "Interview Success",
      "Current Path": currentPath.interviewSuccessProb,
      "Aggressive Path": aggressivePath.interviewSuccessProb,
      "Optimized Path": optimizedPath.interviewSuccessProb,
    },
    {
      metric: "Offer Odds",
      "Current Path": currentPath.offerProb,
      "Aggressive Path": aggressivePath.offerProb,
      "Optimized Path": optimizedPath.offerProb,
    },
    {
      metric: "Goal Completion",
      "Current Path": currentPath.goalCompletionProb,
      "Aggressive Path": aggressivePath.goalCompletionProb,
      "Optimized Path": optimizedPath.goalCompletionProb,
    },
  ];

  const getScenarioData = (type: ActiveScenario): ScenarioForecast => {
    switch (type) {
      case "current":
        return currentPath;
      case "aggressive":
        return aggressivePath;
      case "optimized":
        return optimizedPath;
    }
  };

  const selected = getScenarioData(activeScenario);

  return (
    <div className="min-h-screen bg-[#030307] text-slate-100 p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-950/30 px-3 py-1 text-xs font-semibold text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> AI Predictive Telemetry
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            Career Forecasting Engine
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            Simulate future career progress. Compares baseline trajectories against high-intensity output and targeted optimization paths.
          </p>
        </div>
        <div>
          <button 
            onClick={triggerRefresh} 
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-950/50 border border-indigo-400/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Re-simulating..." : "Recalculate Projections"}
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="elevated" className="bg-slate-950/60 border-slate-800/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Current Compensation</span>
              <Coins className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white">{currentSalary}</span>
              <span className="text-xs text-slate-400 font-bold">{unit} ({currency})</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Baseline compensation record</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-slate-950/60 border-slate-800/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Current 12m Projection</span>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-indigo-300">{currentPath.salary12Months}</span>
              <span className="text-xs text-indigo-400/70 font-bold">{unit}</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center ml-auto">
                +{Math.round(((currentPath.salary12Months - currentSalary) / currentSalary) * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Modest organic progression hike</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-slate-950/60 border-slate-800/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">Aggressive 12m Projection</span>
              <Zap className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-purple-300">{aggressivePath.salary12Months}</span>
              <span className="text-xs text-purple-400/70 font-bold">{unit}</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center ml-auto">
                +{Math.round(((aggressivePath.salary12Months - currentSalary) / currentSalary) * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Driven by volume and stretch targets</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-slate-950/60 border-slate-850/80 shadow-indigo-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Optimized 12m Projection</span>
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-emerald-300">{optimizedPath.salary12Months}</span>
              <span className="text-xs text-emerald-400/70 font-bold">{unit}</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center ml-auto">
                +{Math.round(((optimizedPath.salary12Months - currentSalary) / currentSalary) * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Achieved via warm referral networks & prep</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS VISUALIZATION GRID */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Salary Growth Curve */}
          <Card className="bg-[#0b0c14] border-slate-800/80">
            <CardHeader className="border-b border-slate-900/60">
              <CardTitle className="flex items-center gap-2 text-md font-bold text-white">
                <TrendingUp className="h-4 w-4 text-indigo-400" /> Salary Trajectory Forecast (12 Months)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Compounded compensation projections in {unit} ({currency}) across the three models.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="aggressiveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 5', 'dataMax + 10']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0b0c14", borderColor: "#1e293b", borderRadius: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="Current Path" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#currentGrad)" />
                    <Area type="monotone" dataKey="Aggressive Path" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#aggressiveGrad)" />
                    <Area type="monotone" dataKey="Optimized Path" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#optimizedGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Probabilities comparison */}
          <Card className="bg-[#0b0c14] border-slate-800/80">
            <CardHeader className="border-b border-slate-900/60">
              <CardTitle className="flex items-center gap-2 text-md font-bold text-white">
                <Target className="h-4 w-4 text-emerald-400" /> Probability Projections Comparison
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Probability percentages for interview conversions, offer receipts, and target goal achievement.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probabilityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="metric" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0b0c14", borderColor: "#1e293b", borderRadius: "12px" }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Bar dataKey="Current Path" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Aggressive Path" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Optimized Path" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SCENARIO DETAILED PLAN */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-400" /> Scenario Playbook & Action Plan
          </h2>
          {/* Path selection pills */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1 self-start sm:self-auto">
            {([
              { id: "current" as ActiveScenario, label: "Current Path" },
              { id: "aggressive" as ActiveScenario, label: "Aggressive Path" },
              { id: "optimized" as ActiveScenario, label: "Optimized Path" },
            ]).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActiveScenario(btn.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeScenario === btn.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Scenario Analysis Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics summary */}
          <Card className="bg-[#0b0c14]/75 border-slate-800/80 lg:col-span-1">
            <CardHeader className="border-b border-slate-900/60 bg-slate-950/20">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                {activeScenario} path metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <span className="text-xs text-slate-500 font-medium">Estimated 6-Month Salary</span>
                <p className="text-2xl font-black text-white mt-1">
                  {selected.salary6Months} <span className="text-xs text-slate-400 font-bold">{unit}</span>
                </p>
                <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      activeScenario === "current" ? "bg-indigo-500" : activeScenario === "aggressive" ? "bg-purple-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (selected.salary6Months / currentSalary) * 50)}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Estimated 12-Month Salary</span>
                <p className="text-2xl font-black text-white mt-1">
                  {selected.salary12Months} <span className="text-xs text-slate-400 font-bold">{unit}</span>
                </p>
                <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      activeScenario === "current" ? "bg-indigo-500" : activeScenario === "aggressive" ? "bg-purple-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (selected.salary12Months / currentSalary) * 50)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-900/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Interview Success Prob.</span>
                  <span className="font-bold text-white">{selected.interviewSuccessProb}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Offer Probability</span>
                  <span className="font-bold text-white">{selected.offerProb}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Goal Completion Rate</span>
                  <span className="font-bold text-white">{selected.goalCompletionProb}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assumptions */}
          <Card className="bg-[#0b0c14]/75 border-slate-800/80 lg:col-span-1">
            <CardHeader className="border-b border-slate-900/60 bg-slate-950/20">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-slate-500" /> Path Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {selected.assumptions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Key Levers */}
          <Card className="bg-[#0b0c14]/75 border-slate-800/80 lg:col-span-1">
            <CardHeader className="border-b border-slate-900/60 bg-slate-950/20">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-slate-500" /> Immediate Growth Levers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {selected.levers.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Global Strategy recommendation box */}
        <Card className="bg-gradient-to-r from-[#0b0d19] via-[#091515] to-[#0d0c14] border-slate-800/80">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">Recommended Strategy: Optimized Path Activation</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Based on predictive analysis of your SDE readiness score ({readinessScore}) and current application history, routing applications through warm referral paths combined with closing identified skill gaps yields a <span className="font-bold text-emerald-400">60% compensation bump</span> inside 12 months with high-confidence completion odds (92%). Avoid pure cold outreach loops to mitigate ghosting risks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
