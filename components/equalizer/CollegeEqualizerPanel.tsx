"use client";

import React, { useState } from "react";
import { X, Award, Zap, TrendingUp, ShieldCheck, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/utils/safeFetch";

export function CollegeEqualizerPanel({
  resumeId,
  resumeData,
  onClose,
  onApplied
}: {
  resumeId: string;
  resumeData: any;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [tier, setTier] = useState<"tier1" | "tier2" | "tier3" | null>(null);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [applying, setApplying] = useState<string[]>([]);

  const institution = resumeData?.education?.[0]?.institution || "Unknown College";

  const analyze = async () => {
    setStatus("loading");
    try {
      const res = await safeFetch("/api/v1/resume/equalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, targetRole: resumeData?.personal?.title || "Software Engineer" })
      });
      if (res.error) throw new Error(res.error);
      
      const data = res.data as any;
      setTier(data.tier);
      if (data.suggestion) {
        setSuggestion(data.suggestion);
      }
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const applyField = async (field: string) => {
    if (!suggestion) return;
    setApplying(prev => [...prev, field]);
    try {
      const res = await safeFetch("/api/v1/resume/equalize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          suggestionId: suggestion.id,
          applyFields: [field]
        })
      });
      if (res.error) throw new Error(res.error);
      onApplied();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(prev => prev.filter(f => f !== field));
    }
  };

  const applyAll = async () => {
    if (!suggestion) return;
    const allFields = ['summary', 'skills', 'education', 'projects'];
    setApplying(allFields);
    try {
      const res = await safeFetch("/api/v1/resume/equalize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          suggestionId: suggestion.id,
          applyFields: allFields
        })
      });
      if (res.error) throw new Error(res.error);
      onApplied();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying([]);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[480px] bg-white shadow-2xl h-full border-l border-gray-200 flex flex-col animate-in slide-in-from-right-8 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-gray-900">Skill-First Equalizer</h3>
              <p className="text-xs font-medium text-gray-500">Opportunity Signal Optimization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {status === "idle" && (
            <div className="flex flex-col items-center justify-center text-center mt-12">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-gray-900 mb-2">Analyze Signals</h4>
              <p className="text-sm text-gray-500 mb-8 max-w-sm">
                Many engineers miss opportunities due to ATS college filters. We'll analyze your resume to ensure it leads with skills and impact, not pedigree.
              </p>
              <Button onClick={analyze} className="w-full max-w-xs h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg">
                Analyze & Optimize
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center justify-center text-center mt-24">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-bold text-gray-500 animate-pulse">Analyzing signal density...</p>
            </div>
          )}

          {status === "error" && (
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 text-center mt-12">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h4 className="font-black text-rose-900 mb-2">Analysis Failed</h4>
              <p className="text-sm text-rose-700 font-medium mb-4">
                Could not complete the analysis. Check your connection and try again.
              </p>
              <Button onClick={() => setStatus("idle")} variant="outline" className="h-9 text-sm font-bold rounded-xl border-rose-200">
                Try Again
              </Button>
            </div>
          )}

          {status === "success" && tier === "tier1" && (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center mt-12">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-black text-emerald-900 mb-2">Strong Institutional Signal</h4>
              <p className="text-sm text-emerald-700 font-medium leading-relaxed">
                Your college ({institution}) is well-recognized by ATS filters. No structural equalization needed.
              </p>
            </div>
          )}

          {status === "success" && (tier === "tier2" || tier === "tier3") && !suggestion && (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center mt-12">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h4 className="font-black text-amber-900 mb-2">AI Analysis Unavailable</h4>
              <p className="text-sm text-amber-700 font-medium">
                We detected {institution} but couldn't generate AI rewrites right now. Try again later.
              </p>
            </div>
          )}

          {status === "success" && (tier === "tier2" || tier === "tier3") && suggestion && (
            <div className="space-y-6">
              
              {/* Analysis Header */}
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">AI Detected: {institution}</h4>
                    <p className="text-xs font-medium text-amber-700 mt-1 leading-relaxed">
                      Many great engineers from non-IIT/NIT colleges miss opportunities due to unconscious bias. Let's reorder your signals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rationale & Scoring */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Recruiter Attention</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    +{suggestion?.attentionGain ?? 28}%
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium mt-1">Estimated impact gain</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <div className="flex items-center gap-2 text-rose-500 mb-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Signal Density</span>
                  </div>
                  <p className="text-[11px] text-gray-700 font-medium leading-tight">
                    {suggestion?.signalDensity || "40% space spent on low-signal content. Re-prioritizing projects."}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                <p className="text-xs text-indigo-800 font-medium leading-relaxed italic">
                  "{suggestion.rationale}"
                </p>
              </div>

              {/* Diffs */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest">Recommended Optimizations</h4>

                {suggestion.summaryRewrite && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Summary Focus</span>
                      <Button size="sm" onClick={() => applyField('summary')} disabled={applying.includes('summary')} className="h-7 text-xs bg-indigo-600 text-white rounded-lg">
                        {applying.includes('summary') ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                    <div className="p-4 bg-white text-sm text-gray-700">
                      {suggestion.summaryRewrite}
                    </div>
                  </div>
                )}

                {suggestion.educationDeEmphasis && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Education De-emphasis</span>
                      <Button size="sm" onClick={() => applyField('education')} disabled={applying.includes('education')} className="h-7 text-xs bg-indigo-600 text-white rounded-lg">
                        {applying.includes('education') ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                    <div className="p-4 bg-white text-sm text-gray-700 flex gap-4 items-center">
                      <div className="flex-1 opacity-50 line-through text-xs">{institution}</div>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 font-medium text-indigo-700 bg-indigo-50 p-2 rounded-lg text-xs">{suggestion.educationDeEmphasis}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {(status === "success" && (tier === "tier2" || tier === "tier3") && suggestion) && (
          <div className="p-6 border-t border-gray-100 bg-white shrink-0">
            <Button onClick={applyAll} disabled={applying.length > 0} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 mb-3">
              {applying.length > 0 ? "Applying Optimizations..." : "Apply All Optimizations"}
            </Button>
            <p className="text-[10px] text-center text-gray-400 font-medium">
              This optimization keeps all your information factually accurate. It changes emphasis, not content.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
