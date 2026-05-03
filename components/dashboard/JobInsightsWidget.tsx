"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, ArrowRight, Zap, AlertTriangle } from "lucide-react";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";

export function JobInsightsWidget() {
  const [insights, setInsights] = useState<JobIntelligenceOutput | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const cached = localStorage.getItem("job_insights_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setInsights(parsed.data || parsed); // support both formats
      } catch (e) {}
    }
  }, []);

  if (!isMounted) return null;

  if (!insights) {
    return (
      <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-indigo-400">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Job Intelligence</h3>
            <p className="text-sm text-gray-500">Analyze the market to see how your resume stacks up.</p>
          </div>
        </div>
        <Link href="/job-intelligence" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">
          Analyze Market <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const topSkill = insights.top_skills[0];
  const topSkillDemand = insights.demand_frequency[topSkill] || 0;
  const topMissing = insights.missing_skills[0];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-white">
          <BrainCircuit className="h-5 w-5" />
          <h3 className="font-bold">Market Intelligence</h3>
        </div>
        <Link href="/job-intelligence" className="text-xs font-bold text-indigo-100 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
          View Full Report <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        
        {/* Top Skill */}
        <div className="flex flex-col md:items-center md:justify-center md:text-center pt-4 md:pt-0 first:pt-0">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Highest Demand</span>
          <div className="flex items-end md:justify-center gap-2">
            <span className="text-2xl font-black text-gray-900">{topSkill}</span>
            <span className="text-sm font-semibold text-indigo-600 mb-1">{topSkillDemand}%</span>
          </div>
        </div>

        {/* Match Score */}
        <div className="flex flex-col md:items-center md:justify-center md:text-center pt-4 md:pt-0">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Your Match</span>
          <div className="flex items-center md:justify-center gap-2">
            <Zap className={`h-5 w-5 ${insights.user_match_score >= 75 ? 'text-emerald-500' : insights.user_match_score >= 50 ? 'text-amber-500' : 'text-rose-500'}`} />
            <span className={`text-2xl font-black ${insights.user_match_score >= 75 ? 'text-emerald-600' : insights.user_match_score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
              {insights.user_match_score}%
            </span>
          </div>
        </div>

        {/* Top Missing */}
        <div className="flex flex-col md:items-center md:justify-center md:text-center pt-4 md:pt-0">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Critical Gap</span>
          {topMissing ? (
            <div className="flex items-center md:justify-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-lg font-bold text-gray-900">{topMissing}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">No gaps found!</span>
          )}
        </div>

      </div>
    </div>
  );
}
