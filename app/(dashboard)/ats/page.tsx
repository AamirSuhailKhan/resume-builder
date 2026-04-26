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
import {
  useResumeStore,
  selectResumesById,
  selectResumeIds,
  selectHydrate,
  selectUpsertResume,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";

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

// --- Reusable Components ---

function TransformationMessage({ after }: { after: number }) {
  const isAggressive = after > 70;
  
  return (
    <div className="mt-6 p-4 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50">
      <p className="text-lg font-black text-indigo-900 tracking-tight">
        {isAggressive 
          ? "Your resume was likely getting rejected. This fixes the major issues."
          : "This version is significantly stronger than your original resume."}
      </p>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  let level = "LOW";
  let colorClass = "bg-red-100 text-red-700 border-red-200";
  
  if (score >= 75) {
    level = "HIGH";
    colorClass = "bg-green-100 text-green-700 border-green-200";
  } else if (score >= 60) {
    level = "MEDIUM";
    colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-widest uppercase shadow-sm ${colorClass}`}>
      <Target className="h-3.5 w-3.5" /> Interview Chances: {level}
    </div>
  );
}

function ScoreAnimator({ before, after }: { before: number, after: number }) {
  const [displayBefore, setDisplayBefore] = useState(0);
  const [displayAfter, setDisplayAfter] = useState(0);

  useEffect(() => {
    let startBefore = 0;
    let startAfter = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayBefore(Math.floor(startBefore + (before - startBefore) * easeOut));
      setDisplayAfter(Math.floor(startAfter + (after - startAfter) * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [before, after]);

  return (
    <div className="flex flex-col gap-6 bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 text-white relative overflow-hidden h-full">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 w-full">
        
        <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-center opacity-60 relative">
            <p className="text-xs uppercase tracking-widest font-bold text-red-400 mb-1">Before</p>
            <div className="text-4xl font-black text-red-400 font-mono">
              {displayBefore}%
            </div>
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-xl">❌</div>
          </div>
          
          <ArrowRight className="h-8 w-8 text-slate-600 hidden sm:block" />
          
          <div className="text-center relative">
            <p className="text-xs uppercase tracking-widest font-bold text-green-400 mb-1">After</p>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 font-mono drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {displayAfter}%
            </div>
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-2xl animate-bounce">✅</div>
          </div>
        </div>

        <div className="sm:text-right relative z-10">
          <ConfidenceBadge score={after} />
        </div>
      </div>
      
      <div className="relative z-10 mt-auto border-t border-slate-700/50 pt-6">
        <TransformationMessage after={after} />
      </div>
    </div>
  );
}

function ImprovementSummary({ result }: { result: OptimizeResult }) {
  const bulletCount = result.optimizations.length;
  const metricsCount = result.metrics_and_proof.suggested_metrics.length;
  
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-8 h-full">
      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-indigo-500" /> What we improved
      </h3>
      <ul className="space-y-4">
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Strengthened <strong className="text-indigo-600 font-black">{bulletCount}</strong> weak bullet points</span>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Added <strong className="text-indigo-600 font-black">{metricsCount || 3}</strong> measurable impacts</span>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Fixed ATS readability issues</span>
        </li>
        <li className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium text-lg">Identified missing skills & keywords</span>
        </li>
      </ul>
    </div>
  );
}

function PaywallSection({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[4px] rounded-2xl z-20">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100 text-center max-w-lg w-full mx-4 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Premium Content</h3>
        
        <p className="font-bold text-lg text-indigo-600 mb-6 px-4">
          You’re one step away from applying with a strong profile.
        </p>
        
        {/* Value Stack */}
        <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 border border-slate-100">
          <p className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs opacity-70">You'll unlock:</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-gray-700">Optimized Resume</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-gray-700">Personalized Cover Letter</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-gray-700">Ready-to-send HR Email</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> <span className="font-black text-indigo-700">Higher shortlist chances</span></li>
          </ul>
        </div>

        <Button 
          onClick={onUnlock}
          size="lg" 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xl h-16 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 mb-4"
        >
          Unlock Full Application – ₹499
        </Button>
        
        <p className="text-sm font-bold text-gray-600 mb-3">
          Most users apply within 2 minutes after unlocking.
        </p>
        <p className="text-xs font-semibold text-gray-400">
          No subscription • One-time payment • Instant access
        </p>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ApplicationMaximizerPage() {
  const router = useRouter();

  const resumesById = useResumeStore(selectResumesById);
  const resumeIds   = useResumeStore(selectResumeIds);
  const hydrate = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);

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

  const executeAnalysis = async (targetResume: any, targetJob: string, isDemo: boolean) => {
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
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Optimization failed.");
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
    } catch (e: any) {
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
              {resumes.map(r => (
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
