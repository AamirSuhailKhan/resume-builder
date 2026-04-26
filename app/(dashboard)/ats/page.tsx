"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Target, FileText, Sparkles, Wand2, ArrowRight,
  CheckCircle2, AlertCircle, FileSignature, Mail,
  TrendingUp, Link as LinkIcon, Check, Copy, CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { optimizeResume, mergeOptimizedResume, OptimizeResult } from "@/lib/ai";
import {
  useResumeStore,
  selectResumes,
  selectHydrate,
  selectUpsertResume,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";

type OptimizationStep =
  | "idle"
  | "analyzing"
  | "generating"
  | "done"
  | "error";

const STEP_LABELS: Record<OptimizationStep, string> = {
  idle: "",
  analyzing: "Analyzing resume against job requirements...",
  generating: "Maximizing application potential...",
  done: "Done!",
  error: "Something went wrong",
};

export default function ApplicationMaximizerPage() {
  const router = useRouter();

  const resumes = useResumeStore(selectResumes);
  const hydrate = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrate();
      hydrated.current = true;
    }
  }, []);

  const [selectedId, setSelectedId] = useState("");
  const [job, setJob] = useState("");
  const [step, setStep] = useState<OptimizationStep>("idle");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const [activeTab, setActiveTab] = useState<"resume" | "cover" | "email">("resume");

  const resume = useMemo(() => {
    const r = resumes.find(r => r.id === selectedId);
    return r ? normalizeResume(r) : null;
  }, [resumes, selectedId]);

  const isBusy = step !== "idle" && step !== "done" && step !== "error";

  const handleAnalyze = useCallback(async () => {
    if (!resume || !job.trim()) return;

    setStep("analyzing");
    setResult(null);
    setErrorMsg("");
    setApplied(false);
    setActiveTab("resume");

    try {
      await new Promise(r => setTimeout(r, 1000));
      setStep("generating");
      const aiResult = await optimizeResume(resume, job);
      setResult(aiResult);
      setStep("done");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Optimization failed.");
      setStep("error");
    }
  }, [resume, job]);

  const handleApplyAll = () => {
    if (!resume || !result) return;
    const merged = mergeOptimizedResume(resume, result);
    upsertResume(merged);
    setApplied(true);
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-24">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="text-indigo-500" /> Application Maximizer
        </h1>
        <p className="text-gray-500 mt-1">
          Rewrite your resume with quantifiable metrics, strong action verbs, and generate a complete application package.
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

      {/* INPUT */}
      {resumes.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Resume</label>
            <select
              className="w-full border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="">— Choose a resume —</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
            <textarea
              className="w-full border p-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
              rows={6}
              value={job}
              onChange={e => setJob(e.target.value)}
              placeholder="Paste the full job description here..."
            />
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={!resume || !job.trim() || isBusy}
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold transition-all hover:scale-[1.01]"
          >
            {isBusy ? (
              <><Wand2 className="mr-2 h-5 w-5 animate-spin" /> {STEP_LABELS[step]}</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> ✨ Maximize Application</>
            )}
          </Button>
        </div>
      )}

      {/* ERROR STATE */}
      {step === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">Analysis failed</p>
            <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStep("idle")}>Try Again</Button>
        </div>
      )}

      {/* RESULT */}
      {step === "done" && result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

          {/* APPLICATION PACKAGE */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-400" /> Tailored Application Package
                </h3>
                <p className="text-slate-400 text-sm mt-1 mb-4">A complete, job-specific arsenal ready to deploy.</p>
              </div>
              <div className="flex gap-2 mb-4">
                <Button variant={activeTab === "resume" ? "default" : "secondary"} size="sm" onClick={() => setActiveTab("resume")} className={activeTab === "resume" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}>
                  <FileText className="h-4 w-4 mr-2" /> Resume
                </Button>
                <Button variant={activeTab === "cover" ? "default" : "secondary"} size="sm" onClick={() => setActiveTab("cover")} className={activeTab === "cover" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}>
                  <FileSignature className="h-4 w-4 mr-2" /> Cover Letter
                </Button>
                <Button variant={activeTab === "email" ? "default" : "secondary"} size="sm" onClick={() => setActiveTab("email")} className={activeTab === "email" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}>
                  <Mail className="h-4 w-4 mr-2" /> HR Email
                </Button>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 relative min-h-[300px]">
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute top-4 right-4 bg-white"
                onClick={() => handleCopy(
                  activeTab === "resume" ? result.tailored_package.resume : 
                  activeTab === "cover" ? result.tailored_package.cover_letter : 
                  result.tailored_package.email,
                  activeTab
                )}
              >
                {copiedSection === activeTab ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy text
              </Button>
              
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-mono bg-white p-6 rounded-xl border border-gray-200 mt-2">
                {activeTab === "resume" && result.tailored_package.resume}
                {activeTab === "cover" && result.tailored_package.cover_letter}
                {activeTab === "email" && result.tailored_package.email}
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID: OPTIMIZATIONS & METRICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* OPTIMIZATIONS */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-indigo-500" /> Line-by-Line Optimizations
                  </h3>
                  <p className="text-sm text-gray-500">Action verbs and clear impact added.</p>
                </div>
                <Button
                  onClick={handleApplyAll}
                  disabled={applied || result.optimizations.length === 0}
                  className={`transition-colors shadow-sm ${applied ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                  {applied ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Applied</> : <><CheckSquare className="mr-2 h-4 w-4" /> Apply Fixes</>}
                </Button>
              </div>

              <div className="space-y-4 flex-1">
                {result.optimizations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No major rewrites needed.</p>
                ) : (
                  result.optimizations.map((opt, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 bg-red-50/30 border-b border-gray-100">
                        <span className="text-[10px] font-bold uppercase text-red-500 tracking-widest block mb-1">Original</span>
                        <p className="text-sm text-gray-600 line-through decoration-red-300">{opt.original}</p>
                      </div>
                      <div className="p-4 bg-green-50/50 border-b border-gray-100">
                        <span className="text-[10px] font-bold uppercase text-green-600 tracking-widest block mb-1">Optimized</span>
                        <p className="text-sm text-gray-900 font-medium">{opt.improved}</p>
                      </div>
                      <div className="p-3 bg-slate-50 flex flex-col gap-1">
                        <p className="text-xs text-slate-600"><strong className="text-slate-800">Reason:</strong> {opt.reason}</p>
                        <p className="text-xs text-slate-600"><strong className="text-indigo-700">Impact:</strong> {opt.impact}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* METRICS & PROOF */}
            <div className="space-y-6 flex flex-col">
              
              {/* SUGGESTED METRICS */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-sm rounded-2xl p-6 flex-1">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-blue-500" /> Suggested Metrics
                </h3>
                <p className="text-sm text-blue-800 mb-4 opacity-80">Do you have data to back up these achievements? If so, inject these exact metrics.</p>
                
                {result.metrics_and_proof.suggested_metrics.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No metric suggestions.</p>
                ) : (
                  <ul className="space-y-3">
                    {result.metrics_and_proof.suggested_metrics.map((metric, i) => (
                      <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-blue-900 font-medium">{metric}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* PROOF SUGGESTIONS */}
              <div className="bg-white border shadow-sm rounded-2xl p-6 flex-1">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-lg">
                  <LinkIcon className="h-5 w-5 text-amber-500" /> Proof Suggestions
                </h3>
                <p className="text-sm text-gray-500 mb-4">Add these links to your resume to instantly build credibility.</p>

                {result.metrics_and_proof.proof_suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No proof suggestions.</p>
                ) : (
                  <div className="space-y-4">
                    {result.metrics_and_proof.proof_suggestions.map((proof, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <p className="text-sm text-slate-800 font-bold mb-2">{proof.achievement}</p>
                        <div className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-600">Consider linking: <strong className="text-amber-700">{proof.suggested_proof}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ACTIONS */}
          <div className="flex justify-center pt-6 gap-4">
            <Button
              onClick={() => router.push(`/builder?id=${selectedId}`)}
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-md font-bold"
            >
              <FileText className="mr-2 h-4 w-4" /> Go to Editor
            </Button>
            <Button
              onClick={() => {
                setStep("idle");
                setResult(null);
                setApplied(false);
              }}
              size="lg"
              variant="outline"
              className="border-gray-300"
            >
              Analyze Another Job
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
