"use client";
import React from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, TrendingUp, Link2, Target } from "lucide-react";

export interface GapAnalysis {
  criticalGaps: Array<{
    type: string;
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    action: string;
    estimatedWeeks: number;
  }>;
  hiddenOpportunities: Array<{
    title: string;
    description: string;
    confidence: number;
    nextStep: string;
  }>;
  relationshipInsights: Array<{
    from: string;
    to: string;
    relationship: string;
    insight: string;
    actionable: boolean;
  }>;
  careerProgressScore: number;
  progressSummary: string;
  nextMilestone: string;
  estimatedTimeToGoal: string;
}

const impactColor = { high: "bg-rose-950/60 text-rose-300 border-rose-800/40", medium: "bg-amber-950/60 text-amber-300 border-amber-800/40", low: "bg-slate-900 text-slate-400 border-slate-800" };
const typeIcon = (t: string) => ({ skill: "⚡", experience: "💼", certification: "🏅", network: "🔗", application: "📬", interview_prep: "🎯" }[t] ?? "•");

export function GraphGapPanel({ analysis }: { analysis: GapAnalysis }) {
  const { criticalGaps, hiddenOpportunities, relationshipInsights, careerProgressScore, progressSummary, nextMilestone, estimatedTimeToGoal } = analysis;
  return (
    <div className="space-y-5">
      {/* Progress Score */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Target className="h-4 w-4 text-purple-400" />Career Progress Score</h3>
          <span className="text-2xl font-black text-white">{careerProgressScore}<span className="text-sm text-slate-400">/100</span></span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-700" style={{ width: `${careerProgressScore}%` }} />
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{progressSummary}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Next Milestone</div>
            <p className="text-xs text-white font-semibold leading-snug">{nextMilestone}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Time to Goal</div>
            <p className="text-xs text-emerald-400 font-bold">{estimatedTimeToGoal}</p>
          </div>
        </div>
      </div>

      {/* Critical Gaps */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-400" />Critical Gaps ({criticalGaps.length})</h3>
        <div className="space-y-2.5">
          {criticalGaps.map((g, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-xl p-3.5 space-y-2 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>{typeIcon(g.type)}</span>
                  <span className="text-xs font-bold text-white">{g.title}</span>
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${impactColor[g.impact]}`}>{g.impact}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">{g.description}</p>
              <div className="flex items-start gap-1.5 bg-slate-950/60 rounded-lg p-2">
                <span className="text-purple-400 text-[10px] font-black flex-shrink-0 mt-0.5">›</span>
                <p className="text-[10px] text-purple-200 leading-normal">{g.action}</p>
              </div>
              <span className="text-[9px] text-slate-500 font-bold">{g.estimatedWeeks}w to close</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden Opportunities */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" />Hidden Opportunities</h3>
        <div className="space-y-3">
          {hiddenOpportunities.map((o, i) => (
            <div key={i} className="bg-amber-950/10 border border-amber-900/20 hover:border-amber-900/40 rounded-xl p-3.5 space-y-2 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{o.title}</span>
                <span className="text-[10px] text-emerald-400 font-black">{Math.round(o.confidence * 100)}% confidence</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">{o.description}</p>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-300 leading-normal">{o.nextStep}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Relationship Insights */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Link2 className="h-4 w-4 text-blue-400" />Relationship Insights</h3>
        <div className="space-y-2.5">
          {relationshipInsights.map((r, i) => (
            <div key={i} className="bg-blue-950/10 border border-blue-900/20 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded">{r.from}</span>
                <TrendingUp className="h-3 w-3 text-slate-500" />
                <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded">{r.to}</span>
                {r.actionable && <span className="text-[9px] text-emerald-400 font-black uppercase">Actionable</span>}
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">{r.insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
