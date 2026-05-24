"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { 
  AlertCircle, 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Wand2, 
  Zap, 
  ShieldCheck, 
  Gauge, 
  Eye, 
  UserCheck, 
  MapPin, 
  Briefcase, 
  BookOpen, 
  Plus, 
  Trash2, 
  Award, 
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
  Calendar,
  ExternalLink,
  CheckCircle,
  Clock,
  Sparkle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SuggestionEditor } from "@/components/suggestions/SuggestionEditor";
import {
  selectError,
  selectHydrate,
  selectIsHydrated,
  selectLoading,
  selectResumeIds,
  selectResumesById,
  selectUpsertResume,
  useResumeStore,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";
import type { ResumeData } from "@/lib/storage";
import type { ResumeSuggestion, SuggestionSession } from "@/types/suggestions";
import { motion, AnimatePresence } from "framer-motion";
import EmailCaptureBar from "@/components/EmailCaptureBar";

type OptimizationStep = "idle" | "analyzing" | "done" | "error";

const STEP_LABELS: Record<OptimizationStep, string> = {
  idle: "",
  analyzing: "Deconstructing resume, mapping skill hierarchies, and simulating recruiter eye-tracking...",
  done: "Analysis Completed",
  error: "Analysis Failed",
};

const DEMO_RESUME = {
  id: "demo",
  title: "Senior Software Engineer (Draft)",
  personal: {
    name: "Rohit Sharma",
    email: "rohit.sharma@domain.in",
    phone: "+91 98765 43210",
    location: "Bengaluru, India",
    summary: "Experienced Software Engineer working on web technologies. Familiar with frontend and backend frameworks. Managed database operations and worked with cross-functional teams to deliver key projects.",
  },
  experience: [
    {
      id: "exp-1",
      company: "InnovateTech India",
      role: "Software Developer",
      startDate: "2021-06",
      endDate: "Present",
      points: "Worked on building new features for our core SaaS dashboard.\nFixed critical database query latency issues.\nCollaborated with product designers to rewrite customer onboarding flows.\nMaintained system availability and did deployments.",
    },
    {
      id: "exp-2",
      company: "Cloudscale Solutions",
      role: "Associate Developer",
      startDate: "2019-08",
      endDate: "2021-05",
      points: "Assisted in code migrations from legacy architecture.\nCreated internal helper APIs in Node.js.\nReviewed teammate PRs and wrote code documentation.",
    }
  ],
  education: [
    {
      id: "edu-1",
      school: "VIT Vellore",
      degree: "B.Tech in Computer Science",
      year: "2019"
    }
  ],
  skills: ["React", "JavaScript", "HTML", "CSS", "Node.js", "Express", "MongoDB", "SQL"],
  projects: [],
  customSections: [],
};

const DEMO_JD = `We are looking for a Senior Full Stack Engineer (Node.js/Next.js/Postgres) to join our Core Platforms team at CRED.

Key Responsibilities:
- Build high-scale server-side services handling high concurrency.
- Architect complex React/Next.js UI interfaces with fluid states.
- Re-architect database queries and index models in PostgreSQL and Redis to reduce latency to <20ms.
- Lead system refactoring, introduce strict observability (Datadog/OpenTelemetry), and drive performance optimization.
- Work closely with founders and lead engineers to ship P0 features.

Requirements:
- 4+ years of production experience in high-scale environments.
- Strong depth in React, Next.js, Node.js, Redis, and relational databases.
- Demonstrable track record of optimization and performance metrics.`;

type SuggestPayload = {
  data?: SuggestionSession;
  error?: string | null;
};

// Callback tracking interface
interface TrackerItem {
  id: string;
  company: string;
  role: string;
  status: "applied" | "screening" | "technical" | "offered" | "ghosted";
  appliedDate: string;
  link?: string;
  notes?: string;
}

export default function ApplicationMaximizerPage() {
  const router = useRouter();

  const resumesById = useResumeStore(selectResumesById);
  const resumeIds = useResumeStore(selectResumeIds);
  const hydrate = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);
  const loading = useResumeStore(selectLoading);
  const error = useResumeStore(selectError);
  const isHydrated = useResumeStore(selectIsHydrated);
  const [mounted, setMounted] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    setMounted(true);
    if (!hydrated.current) {
      hydrate();
      hydrated.current = true;
    }
  }, [hydrate]);

  const resumes = useMemo(
    () => resumeIds.map((id) => resumesById[id]).filter(Boolean),
    [resumeIds, resumesById],
  );

  const [selectedId, setSelectedId] = useState("");
  const [job, setJob] = useState("");
  const [step, setStep] = useState<OptimizationStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [suggestionSession, setSuggestionSession] = useState<SuggestionSession | null>(null);

  // Tabs for the advanced dashboard layout
  const [activeTab, setActiveTab] = useState<"overview" | "suggestions" | "scannability" | "weaknesses" | "indiaFit" | "callbackTracker">("overview");

  // Tracker state
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);
  const [showAddTracker, setShowAddTracker] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newStatus, setNewStatus] = useState<TrackerItem["status"]>("applied");
  const [newLink, setNewLink] = useState("");

  // Pre-analysis onboarding checklist states
  const [onboardingChecked, setOnboardingChecked] = useState({
    atsLayout: true,
    contactInfo: true,
    outcomeMetrics: false,
    noImages: true
  });

  const resume = useMemo(() => {
    const selected = selectedId ? resumesById[selectedId] : undefined;
    return selected ? normalizeResume(selected) : null;
  }, [resumesById, selectedId]);

  const isBusy = step === "analyzing";

  // Load tracker items from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem("careeros_callback_tracker");
    if (stored) {
      try {
        setTrackerItems(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveTracker = (items: TrackerItem[]) => {
    setTrackerItems(items);
    localStorage.setItem("careeros_callback_tracker", JSON.stringify(items));
  };

  const handleAddTracker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole) return;
    const item: TrackerItem = {
      id: crypto.randomUUID(),
      company: newCompany,
      role: newRole,
      status: newStatus,
      appliedDate: new Date().toISOString().split("T")[0] ?? "",
      ...(newLink ? { link: newLink } : {}),
    };
    saveTracker([item, ...trackerItems]);
    setNewCompany("");
    setNewRole("");
    setNewStatus("applied");
    setNewLink("");
    setShowAddTracker(false);
  };

  const handleDeleteTracker = (id: string) => {
    const updated = trackerItems.filter((x) => x.id !== id);
    saveTracker(updated);
  };

  async function requestSuggestions(targetResume: ResumeData, targetJob: string, isDemo: boolean) {
    setStep("analyzing");
    setErrorMsg("");
    setIsDemoMode(isDemo);
    setSuggestionSession(null);
    setActiveTab("overview");

    try {
      const activeResumeId = isDemo ? undefined : targetResume.id;
      const response = await fetch("/api/resume/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(activeResumeId ? { resumeId: activeResumeId } : { resumeData: targetResume }),
          jobDescription: targetJob,
        }),
      });

      const payload = await response.json().catch(() => null) as SuggestPayload | null;
      if (!response.ok || !payload || payload.error) {
        throw new Error(payload?.error ?? "Could not generate resume suggestions.");
      }

      if (payload.data) {
        setSuggestionSession(payload.data);
      } else {
        throw new Error("Empty response payload received.");
      }
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Optimization failed.");
      setStep("error");
    }
  }

  const handleAnalyze = () => {
    if (!resume || !job.trim()) return;
    requestSuggestions(resume, job, false);
  };

  const handleDemo = () => {
    const demoResume = normalizeResume(DEMO_RESUME);
    setSelectedId("");
    setJob(DEMO_JD);
    requestSuggestions(demoResume, DEMO_JD, true);
  };

  const currentIntel = suggestionSession?.intelligence;

  // Mock shareable stats payload trigger
  const [copiedLink, setCopiedLink] = useState(false);
  const handleShare = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!mounted || !isHydrated || loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <div className="text-sm font-medium text-gray-400">Initializing Analysis Engine...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-8 flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 font-bold text-rose-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 p-4 pb-24 font-mono text-foreground antialiased md:p-6">
      
      {/* HEADER SECTION */}
      {!suggestionSession && (
        <div className="border border-border bg-[#0d1016] p-6 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-cyan-950 border border-cyan-800 text-cyan-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">
                RESUME INTELLIGENCE ENGINE V1.4
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deconstruct ATS constraints, analyze metric density, and alignment thresholds with recruiter heuristics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUGGESTION / AUDIT RESULTS PANEL */}
      {suggestionSession && (
        <div className="space-y-6">
          
          {/* Active Run Meta Bar */}
          <div className="flex flex-col gap-4 border border-border bg-[#0e1117] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setSuggestionSession(null)}
                className="h-9 rounded-none border border-border bg-transparent px-3 text-xs font-bold text-muted-foreground hover:bg-[#161b22] hover:text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> ESCAPE AUDIT
              </Button>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="text-xs text-muted-foreground uppercase">TARGET: </span>
                <span className="text-xs font-bold text-foreground truncate max-w-[200px] inline-block align-middle">
                  {isDemoMode ? "CRED - Core Platform Senior Fullstack SDE" : (resume?.title ?? "Custom Profile")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleShare}
                className="h-9 rounded-none border border-cyan-500/30 bg-cyan-950/20 px-3 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20"
              >
                {copiedLink ? "COPIED DISPATCH!" : "SHARE AUDIT LOG"}
              </Button>
              {isDemoMode && (
                <div className="bg-amber-950/30 border border-amber-800/60 px-3 py-1.5 text-[10px] font-bold text-amber-400">
                  DEMO RUN
                </div>
              )}
            </div>
          </div>

          {/* MAIN DOCK COCKPIT: Split into left metrics list and right content viewer */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            
            {/* LEFT BAR: Dashboard Perspectives Tabs */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all ${
                  activeTab === "overview"
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400"
                    : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> 1. PROBABILITY COCKPIT
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                onClick={() => setActiveTab("suggestions")}
                className={`flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all ${
                  activeTab === "suggestions"
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400"
                    : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" /> 2. LIVE FIELD SUGGESTIONS
                </span>
                <span className="bg-cyan-900/50 border border-cyan-800 text-[10px] px-1.5 text-cyan-300 font-normal">
                  {suggestionSession.suggestions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("scannability")}
                className={`flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all ${
                  activeTab === "scannability"
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400"
                    : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> 3. 6S EYE-TRACK SIMULATOR
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                onClick={() => setActiveTab("weaknesses")}
                className={`flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all ${
                  activeTab === "weaknesses"
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400"
                    : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> 4. FRICTION POINTS
                </span>
                <span className="bg-red-950 border border-red-800 text-[10px] px-1.5 text-red-400 font-normal">
                  {currentIntel?.weaknesses.length ?? 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("indiaFit")}
                className={`flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all ${
                  activeTab === "indiaFit"
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400"
                    : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> 5. INDIA TIER COMPLIANCE
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                onClick={() => setActiveTab("callbackTracker")}
                className={`flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all ${
                  activeTab === "callbackTracker"
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400"
                    : "border-border bg-[#0e1117] text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 6. DISPATCH TRACKER BOARD
                </span>
                <span className="bg-emerald-950 border border-emerald-800 text-[10px] px-1.5 text-emerald-400 font-normal">
                  {trackerItems.length}
                </span>
              </button>
            </div>

            {/* RIGHT MAIN VIEWPORT */}
            <div className="border border-border bg-[#0b0d13] p-6">
              
              {/* TAB 1: OVERVIEW & CALLBACK PROBABILITY */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="border-b border-border pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-cyan-400" /> CALLBACK PROBABILITY ANALYTICS
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Multi-variate projection of callback rates based on real recruiter response models in target tech brackets.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* Probability Ring Cards */}
                    <div className="border border-border bg-[#0f121a] p-6 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                        Baseline Callback Rate
                      </span>
                      <div className="relative flex items-center justify-center">
                        <svg className="w-36 h-36 transform -rotate-90">
                          <circle cx="72" cy="72" r="58" stroke="#1c2130" strokeWidth="8" fill="transparent" />
                          <circle cx="72" cy="72" r="58" stroke="#ef4444" strokeWidth="8" fill="transparent"
                            strokeDasharray={2 * Math.PI * 58}
                            strokeDashoffset={2 * Math.PI * 58 * (1 - (currentIntel?.callbackProbability.before ?? 35) / 100)}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-black text-rose-500">{currentIntel?.callbackProbability.before}%</span>
                          <span className="text-[9px] text-muted-foreground uppercase mt-0.5">estimated</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-4 max-w-xs">
                        Reflects current metric count, generic verbs, and key skill mismatch constraints.
                      </p>
                    </div>

                    <div className="border border-cyan-500/20 bg-cyan-950/5 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[9px] font-black px-2 py-0.5 uppercase">
                        Projected
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-4">
                        Post-Optimization Rate
                      </span>
                      <div className="relative flex items-center justify-center">
                        <svg className="w-36 h-36 transform -rotate-90">
                          <circle cx="72" cy="72" r="58" stroke="#1c2130" strokeWidth="8" fill="transparent" />
                          <circle cx="72" cy="72" r="58" stroke="#10b981" strokeWidth="8" fill="transparent"
                            strokeDasharray={2 * Math.PI * 58}
                            strokeDashoffset={2 * Math.PI * 58 * (1 - (currentIntel?.callbackProbability.after ?? 82) / 100)}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-black text-emerald-400">{currentIntel?.callbackProbability.after}%</span>
                          <span className="text-[9px] text-emerald-500/70 uppercase mt-0.5">Optimized Target</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-emerald-400/80 leading-normal mt-4 max-w-xs font-semibold">
                        Requires adopting all recommended outcome adjustments and tech keywords.
                      </p>
                    </div>
                  </div>

                  {/* Multi-Dimensional Audit Score Decomposition */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      DECISIVE METRIC DECOMPOSITION
                    </h3>
                    
                    <div className="space-y-3">
                      {currentIntel && Object.entries(currentIntel.dimensions).map(([key, val]) => {
                        const labelMap: Record<string, string> = {
                          technicalDepth: "Technical Stack Depth",
                          achievementFraming: "Achievement Metric Density",
                          atsCompatibility: "ATS System Compliance",
                          recruiterPsychology: "Recruiter Read Friction",
                          marketCompetitiveness: "Market Competitiveness Bench"
                        };
                        return (
                          <div key={key} className="border border-border bg-[#0e1117] p-4 text-xs font-mono">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-bold text-foreground">{labelMap[key] || key}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Baseline: {val.before}%</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-emerald-400 font-bold">Optimized: {val.after}%</span>
                              </div>
                            </div>
                            
                            {/* Sliders overlay */}
                            <div className="mt-2.5 bg-muted h-2 rounded relative border border-border">
                              <div className="bg-rose-500 h-full rounded absolute" style={{ width: `${val.before}%` }} />
                              <div className="bg-emerald-500/50 h-full rounded absolute" style={{ left: `${val.before}%`, width: `${val.after - val.before}%` }} />
                            </div>
                            
                            <p className="mt-2.5 text-[10px] text-muted-foreground leading-normal">
                              {val.feedback}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE FIELD SUGGESTIONS EDITOR (Wrapper for SuggestionEditor) */}
              {activeTab === "suggestions" && (
                <div className="space-y-4">
                  <div className="border-b border-border pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-tight text-foreground">
                        FIELD-LEVEL SUGGESTION TUNER
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inspect, edit, and apply precision adjustments directly to your active resume snapshot.
                      </p>
                    </div>
                  </div>
                  
                  <SuggestionEditor
                    session={suggestionSession}
                    persist={!isDemoMode}
                    onApplied={(updatedResume) => {
                      upsertResume(updatedResume, true);
                      // Update active snapshot inside the session to display changes instantly
                      setSuggestionSession({
                        ...suggestionSession,
                        resumeSnapshot: updatedResume,
                      });
                    }}
                  />
                </div>
              )}

              {/* TAB 3: 6-SECOND SCAN SIMULATOR */}
              {activeTab === "scannability" && (
                <div className="space-y-6">
                  <div className="border-b border-border pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <Eye className="h-5 w-5 text-cyan-400" /> 6-SECOND EYE-TRACK SIMULATOR
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recruiters scan resumes for an average of 6 seconds. Hover over the highlighted sectors below to see recruiter psychological responses.
                    </p>
                  </div>

                  {/* Simulator Screen */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* Simulated Resume Layout */}
                    <div className="border border-border bg-white text-slate-800 p-6 font-sans text-[10px] relative shadow-lg max-h-[500px] overflow-y-auto">
                      
                      {/* Highlighted Block 1: Header */}
                      <div className="border border-dashed border-cyan-400 bg-cyan-50/70 p-2.5 mb-4 group cursor-pointer relative transition-all hover:bg-cyan-100/80">
                        <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[8px] px-1 font-bold">1.5s scan</div>
                        <h4 className="font-bold text-xs uppercase tracking-tight text-slate-900">
                          {suggestionSession.resumeSnapshot.personal.name}
                        </h4>
                        <p className="text-slate-500 text-[8px] mt-0.5">{suggestionSession.resumeSnapshot.personal.email} | {suggestionSession.resumeSnapshot.personal.phone}</p>
                        <p className="text-slate-600 mt-2 leading-relaxed">
                          {suggestionSession.resumeSnapshot.personal.summary}
                        </p>
                        {/* Recruiter Annotation tooltip */}
                        <div className="hidden group-hover:block absolute left-2 -bottom-20 z-10 w-[240px] bg-slate-900 text-white p-2.5 font-mono text-[9px] leading-relaxed border border-cyan-400 shadow-md">
                          <span className="font-bold text-cyan-400 uppercase">HEURISTIC 1:</span> Checks for target location boundaries and evaluates keyword match alignment.
                        </div>
                      </div>

                      {/* Highlighted Block 2: Skills Matrix */}
                      <div className="border border-dashed border-emerald-400 bg-emerald-50/70 p-2.5 mb-4 group cursor-pointer relative transition-all hover:bg-emerald-100/80">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] px-1 font-bold">1.2s scan</div>
                        <h5 className="font-bold text-[9px] uppercase tracking-wider text-slate-950 mb-1.5">SKILLS MATRIX</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestionSession.resumeSnapshot.skills.map(s => (
                            <span key={s} className="bg-slate-200 text-slate-800 text-[7px] font-bold px-1.5 py-0.5 rounded-sm">{s}</span>
                          ))}
                        </div>
                        <div className="hidden group-hover:block absolute left-2 -bottom-16 z-10 w-[240px] bg-slate-900 text-white p-2.5 font-mono text-[9px] leading-relaxed border border-emerald-400 shadow-md">
                          <span className="font-bold text-emerald-400 uppercase">HEURISTIC 2:</span> Verifies missing technical tools list directly vs team stack constraints.
                        </div>
                      </div>

                      {/* Highlighted Block 3: Experience Roles */}
                      <div className="border border-dashed border-amber-400 bg-amber-50/70 p-2.5 mb-3 group cursor-pointer relative transition-all hover:bg-amber-100/80">
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] px-1 font-bold">1.8s scan</div>
                        <div className="flex justify-between items-center text-slate-900 font-bold">
                          <span>{suggestionSession.resumeSnapshot.experience[0]?.role || "Software Engineer"}</span>
                          <span>{suggestionSession.resumeSnapshot.experience[0]?.company || "InnovateTech"}</span>
                        </div>
                        <p className="text-[7px] text-slate-500 mt-0.5">2021 - Present</p>
                        <p className="text-slate-600 mt-2 leading-relaxed line-clamp-2">
                          {suggestionSession.resumeSnapshot.experience[0]?.points}
                        </p>
                        <div className="hidden group-hover:block absolute left-2 -bottom-16 z-10 w-[240px] bg-slate-900 text-white p-2.5 font-mono text-[9px] leading-relaxed border border-amber-400 shadow-md">
                          <span className="font-bold text-amber-400 uppercase">HEURISTIC 3:</span> Reads latest title, size of target company scale, and checks for direct project ownership.
                        </div>
                      </div>

                      {/* Highlighted Block 4: Core Metrics */}
                      <div className="border border-dashed border-violet-400 bg-violet-50/70 p-2.5 group cursor-pointer relative transition-all hover:bg-violet-100/80">
                        <div className="absolute top-0 right-0 bg-violet-500 text-white text-[8px] px-1 font-bold">1.5s scan</div>
                        <h5 className="font-bold text-[9px] uppercase tracking-wider text-slate-950 mb-1">METRIC TRACK & ACCOMPLISHMENTS</h5>
                        <p className="text-slate-600 leading-normal">
                          Check for outcomes: latency reduction, scale thresholds, load averages.
                        </p>
                        <div className="hidden group-hover:block absolute left-2 -top-20 z-10 w-[240px] bg-slate-900 text-white p-2.5 font-mono text-[9px] leading-relaxed border border-violet-400 shadow-md">
                          <span className="font-bold text-violet-400 uppercase">HEURISTIC 4:</span> Looks for numerical metrics to back claims. Sparse count triggers rejection.
                        </div>
                      </div>

                    </div>

                    {/* Recruiter Evaluation Panel */}
                    <div className="space-y-4">
                      <div className="border border-border bg-[#0e1117] p-4">
                        <span className="text-[10px] text-muted-foreground uppercase">Estimated Scan Speed</span>
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-cyan-400" />
                          <span className="text-base font-bold text-foreground">
                            {currentIntel?.recruiterScannability.scanTimeSeconds ?? 6.2} seconds
                          </span>
                        </div>
                      </div>

                      <div className="border border-border bg-[#0e1117] p-4">
                        <span className="text-[10px] text-muted-foreground uppercase">Readability Index</span>
                        <div className="mt-1 flex items-center gap-2">
                          <Award className="h-4 w-4 text-emerald-400" />
                          <span className="text-base font-bold text-foreground">
                            {currentIntel?.recruiterScannability.readabilityScore ?? 70}/100 (Optimal)
                          </span>
                        </div>
                      </div>

                      <div className="border border-border bg-[#0e1117] p-4 space-y-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">What Recruiter Remembers</span>
                        <ul className="space-y-1.5">
                          {currentIntel?.recruiterScannability.topTakeaways.map((item, idx) => (
                            <li key={idx} className="text-[10px] text-foreground flex items-start gap-1.5">
                              <span className="text-cyan-400 shrink-0">▪</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="border border-red-950/40 bg-red-950/5 border-dashed p-4 space-y-2">
                        <span className="text-[10px] text-red-400 uppercase font-bold flex items-center gap-1.5">
                          <TrendingDown className="h-3.5 w-3.5" /> CRITICAL REJECTION TRIGGERS
                        </span>
                        <ul className="space-y-1.5">
                          {currentIntel?.recruiterScannability.criticalFrictionPoints.map((item, idx) => (
                            <li key={idx} className="text-[10px] text-red-300 flex items-start gap-1.5">
                              <span className="text-red-500 shrink-0">▪</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 4: FRICTION POINTS & WEAKNESSES */}
              {activeTab === "weaknesses" && (
                <div className="space-y-6">
                  <div className="border-b border-border pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" /> RESUME FRICTION ANALYSIS
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Actionable catalog of structural weaknesses that increase dropoff rates in recruiter filters.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {currentIntel?.weaknesses && currentIntel.weaknesses.length > 0 ? (
                      currentIntel.weaknesses.map((item) => (
                        <div key={item.id} className={`border p-4 font-mono text-xs ${
                          item.severity === "critical" 
                            ? "border-red-900 bg-red-950/10 text-red-200" 
                            : "border-amber-900 bg-amber-950/10 text-amber-200"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-widest text-[10px]">
                              {item.severity.toUpperCase()} SEVERITY
                            </span>
                            <span className="bg-black/40 px-2 py-0.5 border border-border text-[9px]">
                              SECTION: {item.section.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="mt-2 text-xs font-bold text-foreground">
                            {item.issue}
                          </p>

                          <div className="mt-2.5 bg-black/30 p-2.5 border border-border/40 text-[10px] text-muted-foreground">
                            <strong className="text-foreground uppercase tracking-widest block mb-1">RECRUITER REMEDY:</strong>
                            {item.recommendation}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 border border-dashed border-border text-muted-foreground text-xs">
                        No critical friction points detected. Resume is highly aligned.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: INDIA TIER COMPLIANCE & MARKET FIT */}
              {activeTab === "indiaFit" && (
                <div className="space-y-6">
                  <div className="border-b border-border pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-cyan-400" /> INDIA MARKET FIT & TIER COMPLIANCE
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aligns resume credentials with standard tier boundaries in the Indian hiring environment.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
                    
                    {/* India Market Tier Card */}
                    <div className="border border-border bg-[#0e1117] p-6 space-y-4">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Evaluated Tier Bracket</span>
                        <div className="mt-1 flex items-center gap-2 text-cyan-400 font-bold text-base">
                          <Layers className="h-5 w-5" />
                          <span>{currentIntel?.indiaMarketFit.tierMatch ?? "Tier-2 Product Org"}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Target Compatibility Match</span>
                        <div className="mt-1 flex items-end gap-1.5 font-bold">
                          <span className="text-2xl text-foreground">{currentIntel?.indiaMarketFit.targetMatchPercentage ?? 70}%</span>
                          <span className="text-xs text-muted-foreground mb-1">fit ratio</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Local Indian Skills Gaps</span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentIntel?.indiaMarketFit.skillsGap.map((s, idx) => (
                            <span key={idx} className="bg-red-950/40 border border-red-900 text-red-300 text-[9px] px-2 py-0.5 font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Checklist */}
                    <div className="border border-border bg-[#0e1117] p-6 space-y-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                        STEPS TO UPGRADE TIER INDEX
                      </span>
                      
                      <div className="space-y-2.5">
                        {currentIntel?.indiaMarketFit.recommendedSteps.map((stepText, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-cyan-800 text-[10px] font-black text-cyan-400">
                              {idx + 1}
                            </span>
                            <span className="leading-tight">{stepText}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 6: DISPATCH TRACKER BOARD */}
              {activeTab === "callbackTracker" && (
                <div className="space-y-6">
                  <div className="border-b border-border pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-400" /> APPLICATION DISPATCH TRACKER
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Track submissions, responses, and callback progress directly linked to this optimized profile.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowAddTracker(!showAddTracker)}
                      className="h-8 rounded-none bg-emerald-950/30 border border-emerald-800 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20"
                    >
                      {showAddTracker ? "CANCEL" : "ADD SUBMISSION"}
                    </Button>
                  </div>

                  {/* Add Submission Form */}
                  {showAddTracker && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      onSubmit={handleAddTracker} 
                      className="border border-border bg-[#0e1117] p-4 space-y-4 text-xs"
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Company Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Swiggy"
                            value={newCompany}
                            onChange={e => setNewCompany(e.target.value)}
                            className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Role Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Senior Backend Engineer"
                            value={newRole}
                            onChange={e => setNewRole(e.target.value)}
                            className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Dispatch Status</label>
                          <select
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value as any)}
                            className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-cyan-400"
                          >
                            <option value="applied">Applied / Dispatched</option>
                            <option value="screening">Phone Screen Scheduled</option>
                            <option value="technical">Technical Evaluation</option>
                            <option value="offered">Offer Secured</option>
                            <option value="ghosted">Ghosted / No Reply</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">JD / Application Link (Optional)</label>
                          <input
                            type="url"
                            placeholder="https://careers.company.com/..."
                            value={newLink}
                            onChange={e => setNewLink(e.target.value)}
                            className="w-full bg-[#161b22] border border-border p-2 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>

                      <Button type="submit" className="h-8 rounded-none bg-cyan-400 text-black font-bold hover:bg-cyan-500 text-xs">
                        SAVE TRACKING LOG
                      </Button>
                    </motion.form>
                  )}

                  {/* Submission Logs List */}
                  <div className="space-y-3">
                    {trackerItems.length > 0 ? (
                      trackerItems.map((item) => {
                        const statusColors: Record<TrackerItem["status"], { border: string, bg: string, text: string }> = {
                          applied: { border: "border-cyan-800", bg: "bg-cyan-950/20", text: "text-cyan-400" },
                          screening: { border: "border-amber-800", bg: "bg-amber-950/20", text: "text-amber-400" },
                          technical: { border: "border-violet-800", bg: "bg-violet-950/20", text: "text-violet-400" },
                          offered: { border: "border-emerald-800", bg: "bg-emerald-950/20", text: "text-emerald-400" },
                          ghosted: { border: "border-red-900", bg: "bg-red-950/20", text: "text-red-400" },
                        };
                        const col = statusColors[item.status] || statusColors.applied;
                        return (
                          <div key={item.id} className="border border-border bg-[#0e1117] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-1 font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{item.company}</span>
                                <span className="text-[10px] text-muted-foreground">({item.role})</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>Sent: {item.appliedDate}</span>
                                {item.link && (
                                  <a href={item.link} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-0.5">
                                    Link <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className={`border ${col.border} ${col.bg} ${col.text} text-[10px] font-bold px-2 py-0.5 uppercase`}>
                                {item.status}
                              </span>
                              <button
                                onClick={() => handleDeleteTracker(item.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 border border-dashed border-border text-xs text-muted-foreground">
                        No submissions recorded yet. Click &quot;ADD SUBMISSION&quot; to begin tracking callbacks.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* INPUT FORM (Only when no session is loaded) */}
      {!suggestionSession && !isBusy && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          
          {/* Main Form Fields */}
          <div className="border border-border bg-[#0b0d13] p-6 space-y-6">
            
            {/* Step 1: Base resume select */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <span className="flex h-5 w-5 items-center justify-center bg-cyan-950 border border-cyan-800 text-[10px] text-cyan-400">1</span>
                SELECT ACTIVE RESUME SNAPSHOT
              </label>
              
              {resumes.length > 0 ? (
                <select
                  className="w-full bg-[#0d1016] border border-border p-3 text-xs font-bold text-foreground focus:outline-none focus:border-cyan-400"
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  <option value="">-- CHOOSE SOURCE --</option>
                  {resumes.filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              ) : (
                <div className="border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No active profiles. Create one first or use the Demo.
                </div>
              )}
            </div>

            {/* Step 2: Paste JD */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <span className="flex h-5 w-5 items-center justify-center bg-cyan-950 border border-cyan-800 text-[10px] text-cyan-400">2</span>
                PASTE TARGET JOB SPECIFICATION (JD)
              </label>
              <textarea
                className="w-full bg-[#0d1016] border border-border p-4 text-xs font-medium text-foreground leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-0"
                rows={10}
                value={job}
                onChange={(event) => setJob(event.target.value)}
                placeholder="Paste requirements, stack specifications, performance metrics from job post..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                onClick={handleAnalyze}
                disabled={!resume || !job.trim() || isBusy}
                className="h-12 w-full rounded-none bg-cyan-400 text-black font-black uppercase tracking-wider hover:bg-cyan-500 hover:scale-[1.01] transition-all disabled:opacity-50 sm:w-2/3"
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> START COGNITIVE AUDIT
              </Button>

              <Button
                onClick={handleDemo}
                disabled={isBusy}
                className="h-12 w-full rounded-none border border-amber-800 bg-amber-950/20 text-amber-400 text-xs font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all sm:w-1/3"
              >
                <Zap className="mr-1.5 h-4 w-4 text-amber-500" /> SIMULATE DEMO
              </Button>
            </div>

          </div>

          {/* RIGHT SIDE PANEL: Pre-scan Compliance Checklist */}
          <div className="border border-border bg-[#0b0d13] p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5">
              <ShieldCheck className="h-4 w-4 text-cyan-400" /> PRE-FLIGHT COMPLIANCE
            </h3>

            <p className="text-[10px] text-muted-foreground leading-normal">
              Ensure basic structure adheres to parsing heuristics prior to executing full diagnostic audit:
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 text-[10px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onboardingChecked.atsLayout}
                  onChange={e => setOnboardingChecked({...onboardingChecked, atsLayout: e.target.checked})}
                  className="mt-0.5 accent-cyan-400"
                />
                <div>
                  <strong className="text-foreground block uppercase">Single-column Layout</strong>
                  Multi-column layouts cause text mapping crashes in old parser nodes.
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-[10px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onboardingChecked.contactInfo}
                  onChange={e => setOnboardingChecked({...onboardingChecked, contactInfo: e.target.checked})}
                  className="mt-0.5 accent-cyan-400"
                />
                <div>
                  <strong className="text-foreground block uppercase">Contact Integrity</strong>
                  Presence of email, phone number, and location tags verified.
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-[10px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onboardingChecked.outcomeMetrics}
                  onChange={e => setOnboardingChecked({...onboardingChecked, outcomeMetrics: e.target.checked})}
                  className="mt-0.5 accent-cyan-400"
                />
                <div>
                  <strong className="text-foreground block uppercase">Outcome-oriented Bullets</strong>
                  At least 3 bullets contain quantitative figures or percentages (e.g. &quot;30% improvement&quot;).
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-[10px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onboardingChecked.noImages}
                  onChange={e => setOnboardingChecked({...onboardingChecked, noImages: e.target.checked})}
                  className="mt-0.5 accent-cyan-400"
                />
                <div>
                  <strong className="text-foreground block uppercase">No Image Elements</strong>
                  Zero icons, charts, or images (which render as binary blocks to parsing bots).
                </div>
              </label>
            </div>

            {/* Premium Upgrade Hook Trigger */}
            <div className="border border-cyan-800/40 bg-cyan-950/10 p-3.5 space-y-2 text-[10px] border-dashed">
              <span className="font-bold text-cyan-400 uppercase flex items-center gap-1">
                <Sparkle className="h-3 w-3" /> INTEL UNLIMITED
              </span>
              <p className="text-muted-foreground leading-normal">
                Unlock high-fidelity market mapping for Swiggy Instamart, Zepto, and Razorpay recruiter patterns.
              </p>
              <Button 
                onClick={() => router.push("/settings")}
                className="w-full h-7 rounded-none bg-cyan-400 text-black font-bold uppercase tracking-widest text-[9px] hover:bg-cyan-500"
              >
                UPGRADE ACCOUNT
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* BUSY LOADING STATE */}
      {isBusy && (
        <div className="border border-border bg-[#0b0d13] p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[350px]">
          <div className="relative">
            <Wand2 className="h-10 w-10 text-cyan-400 animate-spin" />
            <div className="absolute inset-0 h-10 w-10 border border-dashed border-cyan-500 rounded-full animate-ping opacity-30" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-foreground">Executing Semantic Compliance Check</h3>
            <p className="text-[10px] text-muted-foreground max-w-md leading-relaxed">
              {STEP_LABELS.analyzing}
            </p>
          </div>
        </div>
      )}

      {/* API ERROR DISPLAY */}
      {step === "error" && (
        <div className="border border-red-900 bg-red-950/10 p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="text-xs font-bold text-red-400 uppercase">Analysis Interrupted</h3>
            <p className="text-[10px] text-red-300 leading-normal">{errorMsg}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-none border-red-800 bg-transparent text-red-400 text-[10px] font-bold hover:bg-red-950/20 mt-1"
              onClick={() => setStep("idle")}
            >
              TRY RE-ENTRY
            </Button>
          </div>
        </div>
      )}

      {suggestionSession && (
        <EmailCaptureBar
          source="ats"
          metadata={{
            score: suggestionSession.intelligence?.callbackProbability?.after ?? 82,
            jobTitle: isDemoMode ? "CRED - Core Platform Senior Fullstack SDE" : (resume?.title ?? "Custom Profile"),
            matchRate: suggestionSession.intelligence?.indiaMarketFit?.targetMatchPercentage ?? 70,
          }}
        />
      )}

    </div>
  );
}
