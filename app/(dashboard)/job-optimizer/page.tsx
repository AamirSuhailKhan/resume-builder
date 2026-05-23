"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  UploadCloud, FileText, Sparkles, Wand2, CheckCircle2,
  TrendingUp, PlayCircle, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { analyzeJobDescription, optimizeResume, JobAnalysisResult, OptimizeResult, mergeOptimizedResume } from "@/lib/ai";
import { useResumeStore, selectResumesById, selectResumeIds, selectHydrate, selectUpsertResume } from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";

// Keep existing step types
type OptimizationStep = "idle" | "analyzing" | "generating" | "done" | "error";

const SAMPLE_RESUME = {
  id: "demo-resume-1",
  title: "Demo Resume",
  personal: {
    firstName: "Alex",
    lastName: "Developer",
    email: "alex@example.com",
    phone: "555-0123",
    summary: "Software engineer with some experience in web development.",
  },
  experience: [
    {
      id: "exp-1",
      company: "Tech Corp",
      role: "Frontend Developer",
      startDate: "2020-01",
      endDate: "2023-01",
      points: "• Worked on the main website\n• Fixed bugs and issues\n• Used React and CSS",
    }
  ],
  education: [],
  skills: ["React", "JavaScript", "HTML"],
  projects: [],
  customSections: [],
};

const SAMPLE_JD = `We are looking for a Senior Frontend Engineer to join our team. 
You will be responsible for building high-performance web applications using React, Next.js, and Tailwind CSS.
Requirements:
- 5+ years of experience with modern JavaScript frameworks
- Strong understanding of state management (Zustand/Redux)
- Experience with performance optimization and core web vitals
- Ability to lead frontend architecture decisions`;

export default function JobOptimizerPage() {
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

  const [mounted, setMounted] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    setMounted(true);
    if (!hydrated.current) {
      hydrate();
      hydrated.current = true;
    }
  }, [hydrate]);

  const [selectedId, setSelectedId] = useState("");
  const [job, setJob] = useState("");
  const [step, setStep] = useState<OptimizationStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  
  // We can store either a JobAnalysisResult (if no resume) or OptimizeResult (if resume provided)
  const [jobResult, setJobResult] = useState<JobAnalysisResult | null>(null);
  const [optResult, setOptResult] = useState<OptimizeResult | null>(null);

  // File upload state mockup
  const [uploadedFileName, setUploadedFileName] = useState("");

  const resume = useMemo(() => {
    if (selectedId === "demo-resume-1") return normalizeResume(SAMPLE_RESUME);
    // O(1) dictionary lookup instead of O(n) .find()
    const r = selectedId ? resumesById[selectedId] : undefined;
    return r ? normalizeResume(r) : null;
  }, [resumesById, selectedId]);

  const isBusy = step !== "idle" && step !== "done" && step !== "error";

  const handleAnalyze = async (demoMode = false) => {
    const targetJob = demoMode ? SAMPLE_JD : job;
    const targetResume = demoMode ? normalizeResume(SAMPLE_RESUME) : resume;

    if (!targetJob.trim()) return;

    setStep("analyzing");
    setJobResult(null);
    setOptResult(null);
    setErrorMsg("");

    try {
      if (targetResume) {
        const aiResult = await optimizeResume(targetResume, targetJob);
        setOptResult(aiResult);
      } else {
        // Fallback to existing functionality if no resume is selected
        const data = await analyzeJobDescription(targetJob);
        setJobResult(data);
      }
      setStep("done");
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Failed to analyze.");
      setStep("error");
    }
  };

  const runDemo = () => {
    setSelectedId("demo-resume-1");
    setJob(SAMPLE_JD);
    setUploadedFileName("alex_developer_resume.pdf");
    handleAnalyze(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      // In a real app, parse PDF to text and create a temporary resume object
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <div className="text-sm font-medium text-gray-400">Loading Optimizer...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12 pb-24 font-sans">
      
      {step === "idle" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* HEADER SECTION (HIGH IMPACT) */}
          <div className="text-center max-w-3xl mx-auto space-y-6 mb-12">
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
              Fix Your Resume & <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Get Shortlisted Faster</span>
            </h1>
            <p className="text-xl text-gray-600 font-medium leading-relaxed">
              Upload your resume and paste a job description to instantly see why you're getting rejected — and fix it in seconds.
            </p>
          </div>

          {/* INPUT SECTION (CORE FIX) */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
              
              {/* LEFT: Resume Upload */}
              <div className="p-8 space-y-6 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">1. Your Resume</h3>
                  <div className="text-sm font-semibold text-indigo-600 cursor-pointer hover:underline">
                    Select from My Resumes
                  </div>
                </div>

                {resumes.length > 0 && (
                  <select
                    className="w-full border border-gray-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-gray-700 transition-shadow shadow-sm"
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setUploadedFileName("");
                    }}
                  >
                    <option value="">— Or select an existing resume —</option>
                    {resumes.filter((r): r is NonNullable<typeof r> => Boolean(r)).map((r) => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                    {selectedId === "demo-resume-1" && <option value="demo-resume-1">Demo Resume (Alex Developer)</option>}
                  </select>
                )}

                <div className="relative border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors group cursor-pointer p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileUpload}
                  />
                  {uploadedFileName ? (
                    <>
                      <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-600">
                        <FileText className="h-8 w-8" />
                      </div>
                      <p className="font-bold text-indigo-900">{uploadedFileName}</p>
                      <p className="text-sm text-indigo-600 mt-1 font-medium">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                        <UploadCloud className="h-8 w-8" />
                      </div>
                      <p className="font-bold text-gray-700">Drag & drop your resume</p>
                      <p className="text-sm text-gray-500 mt-1">Supports PDF, DOCX, TXT</p>
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT: Job Description */}
              <div className="p-8 space-y-6">
                <h3 className="text-lg font-bold text-gray-900">2. Target Job Description</h3>
                <textarea
                  className="w-full h-[264px] border border-gray-200 p-5 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-gray-700 transition-shadow shadow-sm placeholder:text-gray-400"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="Paste the full job description here...&#10;&#10;e.g. We are looking for a Senior Software Engineer with 5+ years of React experience..."
                />
              </div>

            </div>

            {/* ACTION FOOTER */}
            <div className="p-8 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              
              {/* TRUST INDICATOR */}
              <div className="flex items-center gap-3 text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-full border border-emerald-100">
                <ShieldCheck className="h-5 w-5" />
                <span>Improve your shortlist chances instantly</span>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Button 
                  onClick={runDemo}
                  variant="outline"
                  size="lg"
                  className="h-14 px-6 rounded-xl font-bold border-gray-200 text-gray-700 hover:bg-gray-50 flex-1 sm:flex-none"
                >
                  <PlayCircle className="mr-2 h-5 w-5 text-indigo-500" /> Try Demo
                </Button>
                
                <Button
                  onClick={() => handleAnalyze(false)}
                  disabled={isBusy || !job.trim() || (!selectedId && !uploadedFileName)}
                  size="lg"
                  className="h-14 px-8 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all flex-1 sm:flex-none"
                >
                  {isBusy ? (
                    <><Wand2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" /> 🚀 Analyze & Fix My Resume</>
                  )}
                </Button>
              </div>

            </div>
          </div>

          {/* VALUE PROPOSITION SECTION */}
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-gray-600 font-medium">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></div>
              <span>See why you're getting rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></div>
              <span>Identify missing skills & keywords</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></div>
              <span>Get high-impact bullet points</span>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS SECTIONS */}
      {step === "done" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-gray-900">Analysis Results</h2>
            <Button onClick={() => setStep("idle")} variant="outline" className="font-bold">
              Start Over
            </Button>
          </div>

          {/* RENDER OPTIMIZE RESULT IF RESUME PROVIDED */}
          {optResult && (
             <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
                  <TrendingUp className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">Resume Optimization Ready</h3>
                    <p className="text-indigo-700">We've generated tailored bullet points and missing metrics for your resume based on this job description.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Line-by-Line Fixes</h4>
                  {optResult.optimizations.map((opt, i) => (
                    <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-5 bg-red-50/50 border-b border-gray-50">
                        <span className="text-[10px] font-bold uppercase text-red-500 tracking-widest block mb-2">Original (Weak)</span>
                        <p className="text-gray-600 line-through decoration-red-300">{opt.original}</p>
                      </div>
                      <div className="p-5 bg-green-50/50 border-b border-gray-50">
                        <span className="text-[10px] font-bold uppercase text-green-600 tracking-widest block mb-2">Improved (Strong)</span>
                        <p className="text-gray-900 font-bold">{opt.improved}</p>
                      </div>
                      <div className="p-4 bg-white flex flex-col md:flex-row gap-4">
                        <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest block mb-1">Reasoning</span>
                          <p className="text-sm text-gray-700">{opt.reason}</p>
                        </div>
                        <div className="flex-1 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                          <span className="text-[10px] font-bold uppercase text-indigo-500 tracking-widest block mb-1">Impact on Shortlist</span>
                          <p className="text-sm text-indigo-800 font-medium">{opt.impact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md" onClick={() => router.push(`/ats`)}>
                    View Full Application Kit
                  </Button>
                </div>
             </div>
          )}

          {/* RENDER JOB ANALYSIS IF NO RESUME PROVIDED (FALLBACK) */}
          {jobResult && !optResult && (
             <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
               <h3 className="font-bold text-gray-900 text-xl border-b pb-4">Job Description Insights</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                   <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-widest">Required Skills</h4>
                   <div className="flex flex-wrap gap-2">
                     {jobResult.required_skills.map((s, i) => <span key={i} className="bg-white border border-gray-200 px-3 py-1 rounded-lg text-sm font-semibold">{s}</span>)}
                   </div>
                 </div>
                 <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                   <h4 className="font-bold text-indigo-900 mb-3 text-sm uppercase tracking-widest">ATS Keywords</h4>
                   <div className="flex flex-wrap gap-2">
                     {jobResult.keywords.map((s, i) => <span key={i} className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold">{s}</span>)}
                   </div>
                 </div>
               </div>
             </div>
          )}

        </div>
      )}
    </div>
  );
}
