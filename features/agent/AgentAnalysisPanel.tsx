"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, DollarSign, Users, Zap, Target } from "lucide-react";

export interface AnalysisData {
  readiness: {
    score: number;
    level: string;
    summary: string;
    strengths: string[];
    gaps: string[];
  };
  missingSkills: Array<{
    skill: string;
    priority: "critical" | "high" | "medium" | "low";
    estimatedWeeksToLearn: number;
    marketDemand: number;
    reason: string;
  }>;
  marketAnalysis: {
    demandScore: number;
    trendDirection: "rising" | "stable" | "declining";
    hiringVolume: string;
    topHiringCompanies: string[];
    geographyInsight: string;
    summary: string;
  };
  salaryAnalysis: {
    currentMarketMedian: number;
    targetRoleMedian: number;
    topPercentileTarget: number;
    currency: string;
    growthPotentialPct: number;
    keyLeverages: string[];
  };
  competitionAnalysis: {
    competitorDensity: "very_high" | "high" | "moderate" | "low";
    avgCandidateExperienceYears: number;
    topCompetitorSkills: string[];
    differentiators: string[];
    summary: string;
  };
  roadmapSummary: {
    totalWeeks: number;
    phases: Array<{ name: string; weeks: number; focus: string }>;
    criticalMilestone: string;
  };
}

function fmt(n: number, currency: string) {
  if (currency === "INR") {
    if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)} LPA`;
    return `₹${n.toLocaleString("en-IN")}`;
  }
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
}

const priorityColor: Record<string, string> = {
  critical: "bg-rose-950/60 text-rose-300 border-rose-800/40",
  high: "bg-amber-950/60 text-amber-300 border-amber-800/40",
  medium: "bg-blue-950/60 text-blue-300 border-blue-800/40",
  low: "bg-slate-900 text-slate-400 border-slate-800",
};

const densityLabel: Record<string, string> = {
  very_high: "Very High",
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

export function AgentAnalysisPanel({ analysis }: { analysis: AnalysisData }) {
  const { readiness, missingSkills, marketAnalysis, salaryAnalysis, competitionAnalysis, roadmapSummary } = analysis;

  const TrendIcon = marketAnalysis.trendDirection === "rising"
    ? TrendingUp
    : marketAnalysis.trendDirection === "declining"
    ? TrendingDown
    : Minus;

  const trendColor = marketAnalysis.trendDirection === "rising"
    ? "text-emerald-400"
    : marketAnalysis.trendDirection === "declining"
    ? "text-rose-400"
    : "text-slate-400";

  return (
    <div className="space-y-6">

      {/* READINESS SCORE */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-400" />
            Current Readiness
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white">{readiness.score}</span>
            <span className="text-xs text-slate-400 font-bold">/100</span>
          </div>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
            style={{ width: `${readiness.score}%`, transition: "width 0.6s ease" }}
          />
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{readiness.summary}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Strengths</span>
            {readiness.strengths.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-rose-400 font-black uppercase tracking-wider">Critical Gaps</span>
            {readiness.gaps.slice(0, 3).map((g, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                <AlertTriangle className="h-3 w-3 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MISSING SKILLS */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Missing Skills
        </h3>
        <div className="space-y-2.5">
          {missingSkills.slice(0, 6).map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-900">
              <div className="space-y-1 flex-grow">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">{s.skill}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${priorityColor[s.priority]}`}>
                    {s.priority}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{s.reason}</p>
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                <div className="text-[10px] text-slate-500 font-bold">{s.estimatedWeeksToLearn}w</div>
                <div className="text-[10px] text-purple-400 font-black">D:{s.marketDemand}/10</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MARKET + SALARY side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Market Analysis */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            Market Demand
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{marketAnalysis.demandScore.toFixed(1)}</span>
            <span className="text-xs text-slate-400">/10</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">{marketAnalysis.summary}</p>
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-black uppercase">Top Hiring</span>
            <div className="flex flex-wrap gap-1">
              {marketAnalysis.topHiringCompanies.slice(0, 5).map((c, i) => (
                <span key={i} className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic">{marketAnalysis.geographyInsight}</p>
        </div>

        {/* Salary Analysis */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Salary Potential
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Current Median</span>
              <span className="font-bold text-slate-300">{fmt(salaryAnalysis.currentMarketMedian, salaryAnalysis.currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Target Role Median</span>
              <span className="font-bold text-indigo-300">{fmt(salaryAnalysis.targetRoleMedian, salaryAnalysis.currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Top 10%</span>
              <span className="font-black text-emerald-400">{fmt(salaryAnalysis.topPercentileTarget, salaryAnalysis.currency)}</span>
            </div>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-3 py-2 text-center">
            <span className="text-emerald-400 font-black text-base">+{salaryAnalysis.growthPotentialPct}%</span>
            <span className="text-[10px] text-emerald-600 font-bold ml-1">growth potential</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-black uppercase">Key Salary Levers</span>
            {salaryAnalysis.keyLeverages.slice(0, 3).map((l, i) => (
              <div key={i} className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="text-purple-500">›</span> {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COMPETITION */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            Competition Analysis
          </h3>
          <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] font-black px-2 py-0.5 rounded-full">
            {densityLabel[competitionAnalysis.competitorDensity]} Density
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{competitionAnalysis.summary}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-black uppercase">Competitor Stack</span>
            <div className="flex flex-wrap gap-1">
              {competitionAnalysis.topCompetitorSkills.slice(0, 5).map((s, i) => (
                <span key={i} className="bg-rose-950/40 border border-rose-900/30 text-rose-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-black uppercase">Your Differentiators</span>
            {competitionAnalysis.differentiators.slice(0, 3).map((d, i) => (
              <div key={i} className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" /> {d}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROADMAP SUMMARY */}
      <div className="bg-slate-950 border border-purple-500/20 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
          <Target className="h-4 w-4" />
          Recommended Roadmap · {roadmapSummary.totalWeeks} Weeks
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {roadmapSummary.phases.map((p, i) => (
            <div key={i} className="flex-shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1 min-w-[120px]">
              <span className="text-[9px] text-purple-400 font-black uppercase">{p.weeks}w</span>
              <div className="text-xs font-bold text-white">{p.name}</div>
              <p className="text-[9px] text-slate-400 leading-tight">{p.focus}</p>
            </div>
          ))}
        </div>
        <div className="bg-purple-950/30 border border-purple-800/30 rounded-xl px-4 py-2.5 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-purple-200 font-medium leading-relaxed">
            <span className="font-black">Critical Milestone:</span> {roadmapSummary.criticalMilestone}
          </p>
        </div>
      </div>

    </div>
  );
}
