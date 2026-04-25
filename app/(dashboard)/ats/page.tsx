"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Target, CheckCircle2, FileText, Sparkles, Wand2,
  ChevronDown, ChevronUp, ArrowRight, TrendingUp, Zap, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { calculateATSScore } from "@/lib/ats";
import { optimizeResume, mergeOptimizedResume, OptimizeResult } from "@/lib/ai";
import {
  useResumeStore,
  selectResumes,
  selectHydrate,
  selectUpsertResume,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";
import { ResumeData } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type ATSResult = {
  score: number;
  suggestions: string[];
  keywordMatchData: { matched: string[]; missing: string[]; percentage: number } | null;
};

type OptimizationStep =
  | "idle"
  | "analyzing"
  | "matching"
  | "rewriting"
  | "recalculating"
  | "done"
  | "error";

const STEP_LABELS: Record<OptimizationStep, string> = {
  idle: "",
  analyzing: "Analyzing job description...",
  matching: "Matching keywords...",
  rewriting: "Rewriting resume with AI...",
  recalculating: "Recalculating ATS score...",
  done: "Done!",
  error: "Something went wrong",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent match!";
  if (score >= 60) return "Good start — improvable";
  return "Needs significant work";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ATSPage() {
  const router = useRouter();

  // Fine-grained Zustand selectors — prevents full re-renders
  const resumes      = useResumeStore(selectResumes);
  const hydrate      = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);

  // ── ONE-SHOT hydration ─────────────────────────────────────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription]     = useState<string>("");
  const [step, setStep]                         = useState<OptimizationStep>("idle");
  const [beforeResult, setBeforeResult]         = useState<ATSResult | null>(null);
  const [afterResult, setAfterResult]           = useState<ATSResult | null>(null);
  const [optimizeResult, setOptimizeResult]     = useState<OptimizeResult | null>(null);
  const [showJdPreview, setShowJdPreview]       = useState(false);
  const [errorMsg, setErrorMsg]                 = useState<string>("");

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedResume: ResumeData | null = useMemo(
    () => {
      const found = resumes.find(r => r.id === selectedResumeId);
      return found ? normalizeResume(found) : null;
    },
    [resumes, selectedResumeId]
  );

  const isBusy = step !== "idle" && step !== "done" && step !== "error";

  const scoreDelta = useMemo(() => {
    if (beforeResult && afterResult) return afterResult.score - beforeResult.score;
    return null;
  }, [beforeResult, afterResult]);

  // ── Main optimizer ─────────────────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (!selectedResume || !jobDescription.trim()) return;

    setStep("analyzing");
    setBeforeResult(null);
    setAfterResult(null);
    setOptimizeResult(null);
    setErrorMsg("");

    try {
      // Step 1: Calculate BEFORE score
      const before = await calculateATSScore(selectedResume, jobDescription);
      setBeforeResult(before as ATSResult);
      setStep("matching");

      // Step 2: Run AI optimization (includes keyword analysis + rewrite)
      setStep("rewriting");
      const result = await optimizeResume(selectedResume, jobDescription);
      setOptimizeResult(result);

      // Step 3: Merge AI improvements safely into the resume
      const merged = mergeOptimizedResume(selectedResume, result.improved);
      upsertResume(merged); // Zustand → persists to localStorage + version history

      // Step 4: Recalculate AFTER score
      setStep("recalculating");
      const after = await calculateATSScore(merged, jobDescription);
      setAfterResult(after as ATSResult);

      setStep("done");
    } catch (err: any) {
      console.error("Optimize error:", err);
      setErrorMsg(err.message || "Optimization failed. Please try again.");
      setStep("error");
    }
  }, [selectedResume, jobDescription, upsertResume]);

  const handleReset = useCallback(() => {
    setStep("idle");
    setBeforeResult(null);
    setAfterResult(null);
    setOptimizeResult(null);
    setErrorMsg("");
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-24">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-8 w-8 text-indigo-500" />
          Job Description Optimizer
        </h1>
        <p className="text-gray-500 mt-1">
          Paste a job description → AI rewrites your resume to maximize ATS score.
        </p>
      </div>

      {/* EMPTY STATE */}
      {resumes.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4 font-medium">No resumes found. Create one first.</p>
          <Button onClick={() => router.push("/builder")}>Create Resume</Button>
        </div>
      )}

      {/* INPUT CARD */}
      {resumes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          {/* Resume Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Resume
            </label>
            <select
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              value={selectedResumeId}
              onChange={e => {
                setSelectedResumeId(e.target.value);
                handleReset();
              }}
            >
              <option value="">— Choose a resume —</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title || "Untitled"} · Updated {new Date(r.updatedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Description
            </label>
            <textarea
              rows={6}
              value={jobDescription}
              onChange={e => { setJobDescription(e.target.value); handleReset(); }}
              placeholder="Paste the full job description here..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              {jobDescription.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleOptimize}
            disabled={!selectedResumeId || !jobDescription.trim() || isBusy}
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:scale-100"
          >
            {isBusy ? (
              <><Wand2 className="mr-2 h-5 w-5 animate-spin" /> {STEP_LABELS[step]}</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> ✨ Optimize for this Job</>
            )}
          </Button>
        </div>
      )}

      {/* PROGRESS STEPS */}
      {isBusy && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-8 text-center animate-in fade-in duration-500">
          <div className="flex justify-center gap-6 mb-6">
            {(["analyzing", "matching", "rewriting", "recalculating"] as OptimizationStep[]).map(s => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-500 ${
                  step === s
                    ? "bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md"
                    : ["done"].includes(step) || (
                        ["analyzing","matching","rewriting","recalculating"].indexOf(step) >
                        ["analyzing","matching","rewriting","recalculating"].indexOf(s)
                      )
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-gray-100 border-gray-200 text-gray-400"
                }`}>
                  {["analyzing","matching","rewriting","recalculating"].indexOf(step) >
                   ["analyzing","matching","rewriting","recalculating"].indexOf(s)
                    ? "✓"
                    : ["analyzing","matching","rewriting","recalculating"].indexOf(s) + 1}
                </div>
                <span className="text-xs text-gray-500 capitalize hidden sm:block">
                  {s === "analyzing" ? "Analyze" : s === "matching" ? "Match" : s === "rewriting" ? "Rewrite" : "Score"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-gray-700 font-semibold">{STEP_LABELS[step]}</p>
          <p className="text-gray-400 text-sm mt-1">This may take 10–20 seconds...</p>
        </div>
      )}

      {/* ERROR STATE */}
      {step === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">Optimization failed</p>
            <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>Try Again</Button>
        </div>
      )}

      {/* RESULTS */}
      {step === "done" && beforeResult && afterResult && optimizeResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

          {/* SCORE COMPARISON */}
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className={`rounded-2xl border p-6 text-center ${scoreBg(beforeResult.score)}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Before</p>
              <div className={`text-6xl font-extrabold ${scoreColor(beforeResult.score)}`}>
                {beforeResult.score}
                <span className="text-2xl text-gray-300 font-bold">/100</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{scoreLabel(beforeResult.score)}</p>
            </div>

            {/* After */}
            <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center relative overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-2">After Optimization</p>
              <div className="text-6xl font-extrabold text-green-600">
                {afterResult.score}
                <span className="text-2xl text-green-300 font-bold">/100</span>
              </div>
              <p className="text-sm text-green-700 mt-2 font-semibold">{scoreLabel(afterResult.score)}</p>

              {/* Delta Badge */}
              {scoreDelta !== null && scoreDelta > 0 && (
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{scoreDelta} pts
                </div>
              )}
            </div>
          </div>

          {/* KEYWORD ANALYSIS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-indigo-500" />
              Keyword Analysis
            </h3>

            {/* Match % bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-600">Keyword Match Rate</span>
                <span className={scoreColor(optimizeResult.keywordMatchData.percentage)}>
                  {optimizeResult.keywordMatchData.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${optimizeResult.keywordMatchData.percentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Matched */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Matched ({optimizeResult.keywordMatchData.matched.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {optimizeResult.keywordMatchData.matched.length > 0
                    ? optimizeResult.keywordMatchData.matched.map(kw => (
                        <span key={kw} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                          {kw}
                        </span>
                      ))
                    : <span className="text-sm text-gray-400 italic">None matched</span>
                  }
                </div>
              </div>

              {/* Missing */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  Missing ({optimizeResult.keywordMatchData.missing.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {optimizeResult.keywordMatchData.missing.length > 0
                    ? optimizeResult.keywordMatchData.missing.map(kw => (
                        <span key={kw} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                          {kw}
                        </span>
                      ))
                    : <span className="text-sm text-green-600 font-semibold">All keywords matched! 🎉</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* IMPROVEMENTS PREVIEW */}
          {(optimizeResult.improved.summary || optimizeResult.improved.experience.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Improvements Applied
              </h3>

              {/* Summary */}
              {optimizeResult.improved.summary && (
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">
                    ✨ Improved Summary
                  </h4>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                    {optimizeResult.improved.summary}
                  </div>
                </div>
              )}

              {/* Experience bullets */}
              {optimizeResult.improved.experience.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
                    ✨ Improved Experience Bullets
                  </h4>
                  <div className="space-y-3">
                    {optimizeResult.improved.experience.map((e, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                          Experience #{e.index + 1}
                        </p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                          {e.points}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Skills */}
              {optimizeResult.improved.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">
                    ➕ Skills Added to Resume
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {optimizeResult.improved.skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
                        + {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUGGESTIONS */}
          {afterResult.suggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Remaining Suggestions
              </h3>
              <ul className="space-y-3">
                {afterResult.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              onClick={() => router.push(`/builder?id=${selectedResumeId}`)}
              size="lg"
              className="bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              View Updated Resume in Builder
            </Button>
            <Button
              onClick={handleReset}
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-600"
            >
              Optimize Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}