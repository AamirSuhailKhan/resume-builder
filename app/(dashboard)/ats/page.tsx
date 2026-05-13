"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Target, FileText, Sparkles, Wand2, ArrowRight,
  CheckCircle2, AlertCircle, FileSignature, Mail,
  TrendingUp, Link as LinkIcon, Check, Copy, CheckSquare, RotateCcw, Lock, Settings2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { optimizeResume, mergeOptimizedResume, OptimizeResult, generateApplicationPackage } from "@/lib/ai";
import { ScoreAnimator } from "@/features/ats/components/ScoreAnimator";
import { ImprovementSummary } from "@/features/ats/components/ImprovementSummary";
import { PaywallSection } from "@/features/ats/components/PaywallSection";
import { SuggestionEditor } from "@/components/suggestions";
import {
  useResumeStore,
  selectResumesById,
  selectResumeIds,
  selectHydrate,
  selectUpsertResume,
  selectLoading,
  selectError,
  selectIsHydrated,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";
import { ResumeData } from "@/lib/storage";
import type { ResumeSuggestion, SuggestionSession } from "@/types/suggestions";

type OptimizationStep = "idle" | "analyzing" | "generating" | "done" | "error";

const STEP_LABELS: Record<OptimizationStep, string> = {
  idle: "",
  analyzing: "Analyzing resume against job requirements...",
  generating: "Maximizing application potential...",
  done: "Done!",
  error: "Something went wrong",
};

// --- Demo Data ---
const DEMO_RESUME = {
  id: "demo",
  title: "Demo Resume",
  personal: {
    firstName: "Alex",
    lastName: "Developer",
    email: "alex@example.com",
    phone: "555-0123",
    summary: "Web developer with some frontend experience looking for new roles.",
  },
  experience: [
    {
      id: "exp-1",
      company: "Tech Corp",
      role: "Junior Developer",
      startDate: "2020",
      endDate: "2023",
      points: "Worked on website updates\nFixed bugs\nUsed React",
    }
  ],
  education: [],
  skills: ["React", "HTML", "CSS"],
  projects: [],
  customSections: [],
};

const DEMO_JD = `We are looking for a Senior React Developer.
Requirements:
- Strong experience with React, Next.js, and Tailwind CSS.
- Proven track record of improving performance and SEO.
- Experience with complex state management (Zustand, Redux).
- Ability to deliver high-quality, impactful features and drive UI architecture.`;

function findSuggestionPath(resume: ResumeData, original: string) {
  if (original && resume.personal.summary.includes(original)) return "personal.summary";

  const experienceIndex = resume.experience.findIndex((experience) => (
    experience.points.includes(original) ||
    experience.role.includes(original) ||
    experience.company.includes(original)
  ));
  if (experienceIndex >= 0) {
    const experience = resume.experience[experienceIndex];
    if (experience?.role.includes(original)) return `experience[${experienceIndex}].role`;
    if (experience?.company.includes(original)) return `experience[${experienceIndex}].company`;
    return `experience[${experienceIndex}].points`;
  }

  return "personal.summary";
}

function buildSuggestionSession(
  resume: ResumeData,
  optimizations: OptimizeResult["optimizations"],
  scores: OptimizeResult["scores"],
  jobDescription: string,
  resumeId?: string,
): SuggestionSession | null {
  const now = new Date().toISOString();
  const suggestions = optimizations.flatMap((optimization, index): ResumeSuggestion[] => {
    if (!optimization.improved.trim()) return [];
    const path = findSuggestionPath(resume, optimization.original);
    return [{
      id: `optimizer-${index}`,
      ...(resumeId ? { resumeId } : {}),
      section: path.startsWith("experience") ? "experience" : "summary",
      path,
      original: optimization.original,
      suggested: optimization.improved,
      rationale: optimization.reason || "Suggested by the optimizer.",
      impact: optimization.impact,
      scoreDelta: Math.max(1, Math.round((scores.after - scores.before) / Math.max(optimizations.length, 1))),
      status: "pending",
      createdAt: now,
    }];
  });

  if (suggestions.length === 0) return null;

  return {
    id: `optimizer-${resume.id}-${scores.after}`,
    ...(resumeId ? { resumeId } : {}),
    source: "optimizer",
    createdAt: now,
    updatedAt: now,
    jobDescription,
    resumeSnapshot: resume,
    suggestions,
    scores,
    persisted: false,
  };
}

// --- Reusable Components ---

// Components imported from @/features/ats/components

// --- Main Component ---

export default function ApplicationMaximizerPage() {
  const router = useRouter();

  const resumesById = useResumeStore(selectResumesById);
  const resumeIds   = useResumeStore(selectResumeIds);
  const hydrate = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);
  const loading      = useResumeStore(selectLoading);
  const error        = useResumeStore(selectError);
  const isHydrated   = useResumeStore(selectIsHydrated);

  // Ordered, stable list — no Object.values, recomputes only on add/delete
  const resumes = useMemo(
    () => resumeIds.map((id) => resumesById[id]).filter(Boolean),
    [resumeIds, resumesById]
  );

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
  
  // Tab System State
  const [activeTab, setActiveTab] = useState<"resume" | "cover" | "email">("resume");
  const [unlocked, setUnlocked] = useState(false); // Paywall simulation
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Editable Tab Content
  const [editableResume, setEditableResume] = useState("");
  const [editableCover, setEditableCover] = useState("");
  const [editableEmail, setEditableEmail] = useState("");

  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Advanced Settings
  const [tone, setTone] = useState("Professional");
  const [focus, setFocus] = useState("ATS Optimized");

  const resume = useMemo(() => {
    // O(1) dictionary lookup instead of O(n) .find() on every render
    const r = selectedId ? resumesById[selectedId] : undefined;
    return r ? normalizeResume(r) : null;
  }, [resumesById, selectedId]);

  const isBusy = step !== "idle" && step !== "done" && step !== "error";

  const suggestionSession = useMemo(() => {
    if (!result) return null;
    const targetResume = isDemoMode ? normalizeResume(DEMO_RESUME) : resume;
    if (!targetResume) return null;
    return buildSuggestionSession(
      targetResume,
      result.optimizations,
      result.scores,
      isDemoMode ? DEMO_JD : job,
      isDemoMode ? undefined : selectedId,
    );
  }, [isDemoMode, job, result, resume, selectedId]);

  const executeAnalysis = async (targetResume: ResumeData, targetJob: string, isDemo: boolean) => {
    setStep("analyzing");
    setResult(null);
    setErrorMsg("");
    setActiveTab("resume");
    setUnlocked(false);
    setShowSuccessBanner(false);
    setIsDemoMode(isDemo);

    try {
      await new Promise(r => setTimeout(r, 1000));
      setStep("generating");
      const aiResult = await optimizeResume(targetResume, targetJob);
      setResult(aiResult);
      
      setEditableResume(aiResult.tailored_package.resume);
      setEditableCover(aiResult.tailored_package.cover_letter);
      setEditableEmail(aiResult.tailored_package.email);

      setStep("done");
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Optimization failed.");
      setStep("error");
    }
  };

  const handleAnalyze = useCallback(() => {
    if (!resume || !job.trim()) return;
    executeAnalysis(resume, job, false);
  }, [resume, job]);

  const handleDemo = () => {
    // Populate form visually as well
    setJob(DEMO_JD);
    setSelectedId("");
    executeAnalysis(normalizeResume(DEMO_RESUME), DEMO_JD, true);
  };

  const handleRegenerate = async () => {
    const targetResume = isDemoMode ? normalizeResume(DEMO_RESUME) : resume;
    const targetJob = isDemoMode ? DEMO_JD : job;
    
    if (!targetResume || !targetJob.trim() || !result) return;
    setIsRegenerating(true);
    try {
      if (activeTab === "resume") {
        const aiResult = await optimizeResume(targetResume, targetJob);
        setResult(aiResult);
        setEditableResume(aiResult.tailored_package.resume);
      } else {
        const pkg = await generateApplicationPackage(targetResume, targetJob, tone, focus);
        setEditableCover(pkg.cover_letter);
        setEditableEmail(pkg.email);
        setResult({
          ...result,
          tailored_package: {
            ...result.tailored_package,
            cover_letter: pkg.cover_letter,
            email: pkg.email
          }
        });
      }
    } catch (e: unknown) {
      console.error("Regeneration failed", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUnlock = () => {
    setUnlocked(true);
    setShowSuccessBanner(true);
    setTimeout(() => setShowSuccessBanner(false), 5000); // Hide after 5s
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };
  
  const handleCopyAll = () => {
    const combined = `Subject: Application for Role\n\nEmail:\n${editableEmail}\n\n-------------------------------------\n\nCover Letter:\n${editableCover}\n\n-------------------------------------\n\nResume:\n${editableResume}`;
    navigator.clipboard.writeText(combined);
    setCopiedSection("all");
    setTimeout(() => setCopiedSection(null), 3000);
  };
  if (error) {
    return (
      <div className="p-6 m-8 text-rose-500 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center font-bold">
        ❌ {error}
      </div>
    );
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <div className="text-gray-400 text-sm font-medium">Initializing Analysis Engine...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-12 pb-24 font-sans">

      {/* HEADER */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black flex items-center justify-center gap-3 text-gray-900 mb-4 tracking-tight">
          <TrendingUp className="text-indigo-600 h-10 w-10 md:h-12 md:w-12" /> Application Engine
        </h1>
        <p className="text-gray-600 text-lg md:text-xl font-medium">
          Rewrite your resume, beat the ATS, and auto-generate your entire application package instantly.
        </p>
      </div>

      {/* EMPTY STATE */}
      {resumes.length === 0 && (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center shadow-sm max-w-3xl mx-auto">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <p className="text-gray-500 mb-6 font-bold text-xl">No resumes found. Create your base resume first.</p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="font-black h-14 px-8 text-lg rounded-xl" onClick={() => router.push("/builder")}>Create Resume</Button>
            <Button size="lg" variant="outline" className="font-bold h-14 px-8 text-lg rounded-xl border-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" onClick={handleDemo}>
              <Zap className="mr-2 h-5 w-5" /> Try Demo
            </Button>
          </div>
        </div>
      )}

      {/* INPUT */}
      {resumes.length > 0 && step === "idle" && (
        <div className="bg-white p-8 md:p-10 rounded-3xl border shadow-2xl shadow-indigo-100/50 space-y-8 max-w-3xl mx-auto">
          <div className="space-y-3">
            <label className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span> 
              Select Base Resume
            </label>
            <select
              className="w-full border-2 border-gray-200 p-5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 font-bold text-gray-800 transition-all text-lg"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="">— Choose a resume —</option>
              {resumes.filter((r): r is NonNullable<typeof r> => Boolean(r)).map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span> 
              Paste Target Job Description
            </label>
            <textarea
              className="w-full border-2 border-gray-200 p-5 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 font-medium text-gray-800 transition-all text-base"
              rows={8}
              value={job}
              onChange={e => setJob(e.target.value)}
              placeholder="Paste the full job description here... Our AI will tailor your entire application to this specific role."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleAnalyze} 
              disabled={!resume || !job.trim() || isBusy}
              size="lg"
              className="w-full sm:w-2/3 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xl rounded-2xl transition-all hover:scale-[1.02] hover:shadow-xl shadow-lg"
            >
              {isBusy ? (
                <><Wand2 className="mr-3 h-6 w-6 animate-spin" /> {STEP_LABELS[step]}</>
              ) : (
                <><Sparkles className="mr-3 h-6 w-6" /> Transform Application</>
              )}
            </Button>
            
            <Button 
              onClick={handleDemo}
              disabled={isBusy}
              variant="outline"
              size="lg"
              className="w-full sm:w-1/3 h-16 font-bold text-lg rounded-2xl border-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
            >
              <Zap className="mr-2 h-5 w-5" /> Try Demo
            </Button>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {step === "error" && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-start gap-4 max-w-3xl mx-auto">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-800">Transformation Failed</p>
            <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStep("idle")}>Try Again</Button>
        </div>
      )}

      {/* RESULT */}
      {step === "done" && result && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700 fade-in">
          
          {isDemoMode && (
            <div className="bg-amber-100 text-amber-800 border border-amber-300 p-4 rounded-2xl flex items-center justify-center font-black gap-2 shadow-sm animate-in zoom-in-95">
              <Zap className="h-5 w-5" /> THIS IS A DEMO RESULT (Not your actual resume)
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="md:col-span-2">
              <ScoreAnimator before={result.scores.before} after={result.scores.after} />
            </div>
            <div className="md:col-span-1">
              <ImprovementSummary result={result} />
            </div>
          </div>

          {suggestionSession && (
            <SuggestionEditor
              session={suggestionSession}
              persist={!isDemoMode}
              onApplied={(updatedResume) => upsertResume(updatedResume, true)}
            />
          )}

          {/* SUCCESS BANNER */}
          {showSuccessBanner && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <p className="font-bold text-green-800 text-lg">Application package unlocked successfully!</p>
            </div>
          )}

          {/* READY TO APPLY PACKAGE */}
          <div id="apply-section" className={`bg-white rounded-3xl border shadow-xl overflow-hidden transition-all duration-500 ${unlocked ? 'shadow-indigo-100/80 ring-2 ring-indigo-50' : 'shadow-slate-100/50'}`}>
            <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Target className="h-6 w-6 text-indigo-400" /> 🚀 Ready to Apply
                </h3>
                <p className="text-slate-400 text-sm mt-2 font-medium">Review and regenerate your assets before sending.</p>
              </div>
              
              <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50 overflow-x-auto w-full md:w-auto">
                <button 
                  onClick={() => setActiveTab("resume")} 
                  className={`flex whitespace-nowrap items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "resume" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
                >
                  <FileText className="h-4 w-4" /> Resume
                </button>
                <button 
                  onClick={() => setActiveTab("cover")} 
                  className={`flex whitespace-nowrap items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "cover" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
                >
                  <FileSignature className="h-4 w-4" /> Cover Letter
                </button>
                <button 
                  onClick={() => setActiveTab("email")} 
                  className={`flex whitespace-nowrap items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "email" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
                >
                  <Mail className="h-4 w-4" /> HR Email
                </button>
              </div>
            </div>
            
            <div className="p-6 md:p-8 bg-slate-50/50 relative flex flex-col">
              
              {/* ADVANCED REGENERATE CONTROLS */}
              {activeTab !== "resume" && (
                <div className={`bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4 shadow-sm transition-opacity duration-300 ${!unlocked ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 border-r border-gray-200 pr-4">
                    <Settings2 className="h-4 w-4 text-indigo-500" /> Controls
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tone</span>
                    <select className="border border-gray-200 rounded-lg text-sm p-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50 font-bold text-gray-700" value={tone} onChange={e => setTone(e.target.value)}>
                      <option>Professional</option>
                      <option>Confident</option>
                      <option>Aggressive</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Focus</span>
                    <select className="border border-gray-200 rounded-lg text-sm p-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50 font-bold text-gray-700" value={focus} onChange={e => setFocus(e.target.value)}>
                      <option>ATS Optimized</option>
                      <option>Recruiter Friendly</option>
                      <option>Impact Heavy</option>
                    </select>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto font-black text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-10 px-4"
                    onClick={handleRegenerate}
                    disabled={isRegenerating || !unlocked}
                  >
                    <RotateCcw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Regenerate Content
                  </Button>
                </div>
              )}
              
              {/* Toolbar */}
              <div className={`flex justify-end gap-3 mb-4 transition-opacity duration-300 ${!unlocked && activeTab !== "resume" ? 'opacity-0' : 'opacity-100'}`}>
                {activeTab === "resume" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-white shadow-sm font-bold h-10"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                  >
                    <RotateCcw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Regenerate Resume
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`shadow-sm font-bold h-10 ${copiedSection === activeTab ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white'}`}
                  disabled={!unlocked && activeTab !== "resume"}
                  onClick={() => handleCopy(
                    activeTab === "resume" ? editableResume : 
                    activeTab === "cover" ? editableCover : editableEmail,
                    activeTab
                  )}
                >
                  {copiedSection === activeTab ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copiedSection === activeTab ? "Copied!" : "Copy text"}
                </Button>
              </div>
              
              {/* Editable Area */}
              <div className={`relative flex-1 flex flex-col min-h-[450px] transition-all duration-500 ${unlocked ? 'shadow-[0_0_20px_rgba(79,70,229,0.05)] rounded-2xl' : ''}`}>
                <textarea
                  className={`w-full flex-1 border border-gray-200 p-8 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono text-[14px] md:text-[15px] text-gray-800 leading-relaxed shadow-sm transition-all duration-500 ${!unlocked && activeTab !== "resume" ? 'blur-[8px] select-none scale-[0.99] opacity-60' : 'focus:border-transparent'}`}
                  value={
                    activeTab === "resume" ? editableResume :
                    activeTab === "cover" ? editableCover : editableEmail
                  }
                  onChange={(e) => {
                    if (activeTab === "resume") setEditableResume(e.target.value);
                    if (activeTab === "cover") setEditableCover(e.target.value);
                    if (activeTab === "email") setEditableEmail(e.target.value);
                  }}
                  readOnly={!unlocked && activeTab !== "resume"}
                />

                {/* PAYWALL SECTION */}
                {!unlocked && activeTab !== "resume" && (
                  <PaywallSection onUnlock={handleUnlock} />
                )}
                
              </div>
            </div>
          </div>

          {/* FINAL ACTION MOMENT */}
          {unlocked && (
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-12 text-center text-white shadow-2xl border border-indigo-500/30 relative overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/20"></div>
              
              <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-5 py-2.5 rounded-full border border-indigo-400/30 text-indigo-200 text-sm font-black uppercase tracking-widest shadow-sm">
                  <CheckCircle2 className="h-4 w-4" /> Takes less than 60 seconds to apply
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  Your application is ready. <br className="hidden md:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Apply now to maximize your chances.</span>
                </h2>
                
                <p className="text-indigo-100/80 text-xl font-medium">
                  Copy your entire optimized toolkit in one click.
                </p>

                <div className="pt-4">
                  <Button 
                    size="lg" 
                    onClick={handleCopyAll}
                    className={`h-20 px-12 rounded-2xl font-black text-xl shadow-2xl hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all hover:-translate-y-1 border-2 ${copiedSection === "all" ? 'bg-green-500 hover:bg-green-600 border-green-400 text-white' : 'bg-white text-indigo-900 hover:bg-gray-50 border-white'}`}
                  >
                    {copiedSection === "all" ? (
                      <><CheckCircle2 className="mr-3 h-7 w-7" /> Copied successfully!</>
                    ) : (
                      <><RocketIcon className="mr-3 h-7 w-7" /> Copy All & Apply</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECONDARY ACTIONS */}
          <div className="flex justify-center pt-8 gap-4">
            <Button
              onClick={() => {
                setStep("idle");
                setResult(null);
                setUnlocked(false);
                setIsDemoMode(false);
              }}
              size="lg"
              variant="outline"
              className="border-gray-200 font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 h-14 px-10 rounded-xl"
            >
              Analyze Another Job
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}

function RocketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 3.82-13.04 1 1 0 0 1 1.66.42 22 22 0 0 1 1.04 13.44" />
      <path d="m15 12 3 3a22 22 0 0 1-13.04 3.82 1 1 0 0 1-.42 1.66 22 22 0 0 1 13.44 1.04" />
      <circle cx="15.5" cy="8.5" r="1.5" />
      <path d="M12 12v.01" />
    </svg>
  );
}
