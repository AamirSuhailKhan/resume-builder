"use client";

import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Sparkles, 
  ChevronRight, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Users, 
  LineChart, 
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SalaryPrediction {
  min: number;
  max: number;
  currency: string;
  confidence?: number;
}

interface JobIntelligence {
  opportunityScore: number;
  hiringVelocity: number;
  marketDemand: number;
  competitionScore: number;
  salaryPrediction: SalaryPrediction | null;
  layoffRisk: number;
  careerGrowth: number;
  matchQuality: number;
  stabilityScore: number;
  whyMatters: string | null;
  interviewProbability: number;
  successProbability: number;
  requiredSkills: string[];
  salaryGrowth: number;
  salaryGrowthExplanation: string | null;
}

interface Opportunity {
  id: string;
  company: string;
  role: string;
  location: string | null;
  salaryRange: string | null;
  description: string;
  matchScore: number;
  intelligence: JobIntelligence | null;
}

export function OpportunityIntelligenceDashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/opportunities");
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        if (data.opportunities?.length > 0) {
          setSelectedOpp(data.opportunities[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const triggerRecompute = async (id: string) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/v1/opportunities/${id}/recompute`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state
        setOpportunities(prev => prev.map(opp => {
          if (opp.id === id) {
            const updated = { ...opp, intelligence: data.intelligence };
            if (selectedOpp?.id === id) {
              setSelectedOpp(updated);
            }
            return updated;
          }
          return opp;
        }));
      }
    } catch (error) {
      console.error("Failed to recompute opportunity score:", error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";
    if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-950/20";
    return "text-rose-400 border-rose-500/30 bg-rose-950/20";
  };

  const formatCurrency = (val: number, cur: string = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#030307] text-slate-100 p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-950/30 px-3 py-1 text-xs font-semibold text-teal-300">
            <Sparkles className="h-3.5 w-3.5" /> Opportunity Intelligence Engine
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-400 bg-clip-text text-transparent">
            Opportunity Matches
          </h1>
          <p className="text-slate-400 text-sm">
            Ranked and scored according to fit, growth, demand, and likelihood of interview.
          </p>
        </div>
        <button
          onClick={fetchOpportunities}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Ranked List
        </button>
      </div>

      {loading && opportunities.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center gap-3 bg-slate-950 border border-slate-800 rounded-3xl">
          <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Analysing your opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-16 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-white">No opportunities found</h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Import or add some job opportunities in the Job Match Dashboard to let the engine rank and evaluate them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT: RANKED LIST ── */}
          <div className="lg:col-span-5 space-y-4 max-h-[750px] overflow-y-auto pr-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 px-1">Ranked Candidates ({opportunities.length})</h3>
            {opportunities.map((opp, idx) => {
              const intel = opp.intelligence;
              const isSelected = selectedOpp?.id === opp.id;
              return (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? "border-teal-500/50 bg-teal-950/10 shadow-[0_0_20px_rgba(20,184,166,0.06)]"
                      : "border-slate-800 bg-[#0a0a0f] hover:border-slate-700 hover:bg-slate-950"
                  }`}
                >
                  {/* Top Choice Badge */}
                  {idx === 0 && (
                    <span className="absolute top-3 right-3 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-fullTimeline">
                      Top Match
                    </span>
                  )}

                  <div className="flex gap-4 items-start">
                    {/* Circle Score */}
                    <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center border font-extrabold ${
                      intel ? getScoreColor(intel.opportunityScore) : "text-slate-500 border-slate-800 bg-slate-900/30"
                    }`}>
                      <span className="text-lg leading-none">{intel?.opportunityScore ?? "—"}</span>
                      <span className="text-[7px] uppercase mt-0.5 opacity-80">Score</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-sm font-black text-white truncate">{opp.role}</h4>
                      <p className="text-xs text-slate-400 truncate">{opp.company}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold">{opp.location || "Remote"}</span>
                        {opp.salaryRange && (
                          <>
                            <span className="text-slate-700 text-xs">•</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{opp.salaryRange}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 mt-1 transition-transform ${isSelected ? "text-teal-400 translate-x-1" : "text-slate-600"}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── RIGHT: INTELLIGENCE PANEL ── */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {selectedOpp && (
                <motion.div
                  key={selectedOpp.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden"
                >
                  {/* Glowing background hint */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full filter blur-[80px] pointer-events-none" />

                  {/* Role Detail Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800/80 pb-6 relative z-10">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-white tracking-tight">{selectedOpp.role}</h2>
                      <p className="text-slate-400 font-bold text-sm">{selectedOpp.company}</p>
                      {selectedOpp.location && (
                        <span className="inline-block text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-400 font-medium">
                          📍 {selectedOpp.location}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center md:text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Opportunity Score</span>
                          <span className="text-xs text-slate-400">calculated via 7 telemetry factors</span>
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-teal-500/10">
                          <div className="h-full w-full bg-[#030307] rounded-[14px] flex items-center justify-center flex-col">
                            <span className="text-2xl font-black text-teal-400 leading-none">
                              {selectedOpp.intelligence?.opportunityScore ?? "—"}
                            </span>
                            <span className="text-[8px] uppercase tracking-wide text-slate-500 mt-1 font-bold">score</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => triggerRecompute(selectedOpp.id)}
                        disabled={analyzingId === selectedOpp.id}
                        className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg transition-all"
                      >
                        <RefreshCw className={`h-3 w-3 ${analyzingId === selectedOpp.id ? "animate-spin" : ""}`} />
                        {analyzingId === selectedOpp.id ? "Analyzing..." : "Re-Analyze"}
                      </button>
                    </div>
                  </div>

                  {selectedOpp.intelligence ? (
                    <div className="space-y-6">
                      {/* WHY THIS OPPORTUNITY MATTERS */}
                      <div className="p-5 bg-teal-950/10 border border-teal-500/20 rounded-2xl space-y-2 relative">
                        <div className="absolute top-4 right-4 text-teal-500/20">
                          <Lightbulb className="h-6 w-6" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" /> Why this opportunity matters
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed font-medium">
                          {selectedOpp.intelligence.whyMatters}
                        </p>
                      </div>

                      {/* KEY DISPLAY BLOCKS: SUCCESS, SALARY, SKILLS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Success Probability */}
                        <div className="p-5 bg-[#0a0a0f] border border-slate-800 rounded-2xl flex flex-col justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <Award className="h-3.5 w-3.5 text-indigo-400" /> Success Probability
                            </h4>
                            <p className="text-xs text-slate-400">Estimated probability of securing this job opportunity</p>
                          </div>
                          <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-indigo-400">
                              {selectedOpp.intelligence.successProbability}%
                            </span>
                            <div className="w-24 bg-slate-900 rounded-full h-2">
                              <div
                                className="bg-indigo-500 h-2 rounded-full"
                                style={{ width: `${selectedOpp.intelligence.successProbability}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expected Salary Growth */}
                        <div className="p-5 bg-[#0a0a0f] border border-slate-800 rounded-2xl flex flex-col justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Expected Salary Growth
                            </h4>
                            <p className="text-xs text-slate-400">Predicted growth against baseline market target</p>
                          </div>
                          <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                              <span className="text-3xl font-black text-emerald-400">
                                +{selectedOpp.intelligence.salaryGrowth}%
                              </span>
                              {selectedOpp.intelligence.salaryPrediction && (
                                <span className="text-[10px] text-slate-500 font-bold mt-1">
                                  Est: {formatCurrency(selectedOpp.intelligence.salaryPrediction.min, selectedOpp.intelligence.salaryPrediction.currency)} - {formatCurrency(selectedOpp.intelligence.salaryPrediction.max, selectedOpp.intelligence.salaryPrediction.currency)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 text-right max-w-[150px] leading-tight font-medium">
                              {selectedOpp.intelligence.salaryGrowthExplanation}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Required Skills */}
                      <div className="p-5 bg-[#0a0a0f] border border-slate-800 rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-teal-400" /> Required Skills & Alignment
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedOpp.intelligence.requiredSkills.map((skill, index) => (
                            <span
                              key={index}
                              className="bg-slate-900 text-teal-300 border border-teal-500/10 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
                            >
                              ⚡ {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* FACTOR ANALYSIS GAUGE BREAKDOWN */}
                      <div className="space-y-4 border-t border-slate-800/80 pt-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Opportunity Factor Analysis</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: "Skill Match", value: selectedOpp.intelligence.matchQuality, color: "#14b8a6", desc: "Correlation to your resume skills profile" },
                            { label: "Salary Growth", value: selectedOpp.intelligence.salaryGrowth, color: "#10b981", desc: "Increase compared to baseline/expectations" },
                            { label: "Competition Control", value: 100 - selectedOpp.intelligence.competitionScore, color: "#a855f7", desc: "Lower candidate backlog in target pool" },
                            { label: "Career Growth", value: selectedOpp.intelligence.careerGrowth, color: "#3b82f6", desc: "Alignment to 5-year trajectory target" },
                            { label: "Hiring Demand", value: selectedOpp.intelligence.hiringVelocity, color: "#f59e0b", desc: "Company velocity and urgent market needs" },
                            { label: "Market Trends", value: selectedOpp.intelligence.marketDemand, color: "#06b6d4", desc: "Trajectory of skills value and industry segment" },
                            { label: "Interview Probability", value: selectedOpp.intelligence.interviewProbability, color: "#ec4899", desc: "Shortlist confidence score" }
                          ].map((factor) => (
                            <div key={factor.label} className="p-4 bg-[#0a0a0f] border border-slate-900 rounded-2xl space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-slate-300">{factor.label}</span>
                                <span className="font-black text-white" style={{ color: factor.color }}>
                                  {Math.round(factor.value)}/100
                                </span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${factor.value}%`, backgroundColor: factor.color }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium leading-tight">{factor.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
                      <HelpCircle className="h-8 w-8 text-slate-600 mx-auto" />
                      <h4 className="text-sm font-bold text-white">No analysis available</h4>
                      <p className="text-xs text-slate-400">
                        This opportunity does not have intelligence calculated yet. Click below to run AI scoring.
                      </p>
                      <button
                        onClick={() => triggerRecompute(selectedOpp.id)}
                        disabled={analyzingId === selectedOpp.id}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl inline-flex items-center gap-2"
                      >
                        <RefreshCw className={`h-3 w-3 ${analyzingId === selectedOpp.id ? "animate-spin" : ""}`} />
                        Calculate Intelligence
                      </button>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
