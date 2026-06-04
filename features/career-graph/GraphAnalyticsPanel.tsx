"use client";
import React from "react";
import type { CareerGraphAnalytics } from "@/lib/career-graph/types";
import { Activity, Zap, TrendingUp, Users, Target, BarChart3 } from "lucide-react";

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function GraphAnalyticsPanel({ analytics }: { analytics: CareerGraphAnalytics }) {
  const { skillCloud, applicationFunnel, skillGapHeatmap, careerVelocity, networkStrength, goalProgress } = analytics;
  const velColor = { accelerating: "text-emerald-400", steady: "text-blue-400", slowing: "text-amber-400" }[careerVelocity.trend];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Application Funnel */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="h-4 w-4 text-indigo-400" />Application Funnel</h3>
        {[
          { label: "Saved", value: applicationFunnel.saved, color: "#6366f1" },
          { label: "Applied", value: applicationFunnel.applied, color: "#8b5cf6" },
          { label: "Interview", value: applicationFunnel.interview, color: "#ec4899" },
          { label: "Offer", value: applicationFunnel.offer, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">{label}</span>
              <span className="font-black" style={{ color }}>{value}</span>
            </div>
            <MiniBar value={value} max={applicationFunnel.saved || 1} color={color} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
          <div className="text-center">
            <div className="text-xs font-black text-indigo-400">{Math.round(applicationFunnel.conversionRates.toInterview * 100)}%</div>
            <div className="text-[9px] text-slate-500 font-bold uppercase">→ Interview</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-black text-emerald-400">{Math.round(applicationFunnel.conversionRates.toOffer * 100)}%</div>
            <div className="text-[9px] text-slate-500 font-bold uppercase">→ Offer</div>
          </div>
        </div>
      </div>

      {/* Career Velocity */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-400" />Career Velocity</h3>
          <span className={`text-[10px] font-black uppercase ${velColor}`}>{careerVelocity.trend}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Apps/wk", value: careerVelocity.applicationsPerWeek.toFixed(1), color: "#6366f1" },
            { label: "Interviews", value: careerVelocity.interviewsPerMonth, color: "#ec4899" },
            { label: "Offers", value: careerVelocity.offersReceived, color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-900/50 border border-slate-900 rounded-xl p-3 text-center">
              <div className="text-lg font-black" style={{ color }}>{value}</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Network Strength */}
        <div className="border-t border-slate-900 pt-3 space-y-2">
          <h4 className="text-[10px] text-slate-500 font-black uppercase flex items-center gap-1"><Users className="h-3 w-3" />Network</h4>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Recruiters</span><span className="font-bold text-white">{networkStrength.totalRecruiters}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Companies</span><span className="font-bold text-white">{networkStrength.activeCompanies}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Avg Trust</span><span className="font-bold text-amber-400">{Math.round(networkStrength.avgRecruiterTrustScore * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Skill Cloud */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap className="h-4 w-4 text-purple-400" />Skill Map</h3>
        <div className="flex flex-wrap gap-1.5">
          {skillCloud.slice(0, 24).map((s) => (
            <span key={s.skill}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border ${s.gap ? "bg-rose-950/40 text-rose-300 border-rose-800/30" : "bg-slate-900 text-slate-300 border-slate-800"}`}
              style={{ fontSize: `${Math.max(9, Math.min(12, 9 + s.weight * 4))}px` }}>
              {s.skill}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-slate-500"><span className="text-rose-400 font-bold">Red</span> = skill gap · size = importance weight</p>
      </div>

      {/* Skill Gap Heatmap */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-400" />Gap Heatmap</h3>
        {skillGapHeatmap.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No skill gaps detected yet.</p>
        ) : skillGapHeatmap.slice(0, 6).map((g) => (
          <div key={g.skill} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-white font-medium">{g.skill}</span>
              <span className="text-slate-500">{Math.round(g.current * 100)}% → {Math.round(g.required * 100)}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-rose-500/60 relative" style={{ width: `${g.required * 100}%` }}>
                <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-500" style={{ width: `${(g.current / g.required) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Goal Progress */}
      {goalProgress.length > 0 && (
        <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Target className="h-4 w-4 text-purple-400" />Goal Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goalProgress.map((g, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white font-semibold">{g.goal}</span>
                  <span className="text-purple-400 font-black">{Math.round(g.progress)}%</span>
                </div>
                <MiniBar value={g.progress} max={100} color="#a855f7" />
                <span className={`text-[9px] font-black uppercase ${g.status === "achieved" ? "text-emerald-400" : "text-slate-500"}`}>{g.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
