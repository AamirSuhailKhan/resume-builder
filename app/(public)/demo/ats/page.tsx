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
import { DemoResultModal } from "@/components/demo/DemoResultModal";
import type { SuggestionSession } from "@/types/suggestions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import EmailCaptureBar from "@/components/EmailCaptureBar";

const PRELOADED_RESUME = {
  personal: {
    name: "Aditya Verma",
    email: "aditya.verma@domain.in",
    phone: "+91 98765 12345",
    location: "Bengaluru, India",
    summary: "Software Engineer with 3 years of hands-on experience building reactive web interfaces and backend services. Skilled in Python, React, and databases. Fast learner seeking growth opportunities.",
  },
  experience: [
    {
      id: "exp-1",
      company: "TechMobility India",
      role: "Software Developer",
      startDate: "2021-07",
      endDate: "Present",
      points: "Worked on frontend features for tracking customer fleets.\nCreated internal Python scripts to scrape transit data.\nCollaborated with frontend developers to migrate old sections."
    }
  ],
  education: [
    {
      id: "edu-1",
      school: "NIT Trichy",
      degree: "B.Tech in Electronics",
      year: "2021"
    }
  ],
  skills: ["Python", "React", "JavaScript", "HTML", "CSS", "SQL", "Git"],
  projects: [],
  customSections: [],
};

const PRELOADED_JD = `We are looking for a Senior Software Engineer to join our Core Platforms team at Razorpay.

Key Responsibilities:
- Build high-scale server-side services handling high concurrency in React and Node.js.
- Lead system refactoring, design relational database queries, and optimize performance.
- Work closely with founds and lead engineers to ship P0 features using clean architecture.

Requirements:
- 5+ years of production experience in high-scale environments.
- Strong depth in React, Node.js, databases, system design, and DSA.`;

type SuggestPayload = {
  data?: SuggestionSession;
  error?: string | null;
};

interface TrackerItem {
  id: string;
  company: string;
  role: string;
  status: "applied" | "screening" | "technical" | "offered" | "ghosted";
  appliedDate: string;
  link?: string;
  notes?: string;
}

export default function DemoAtsPage() {
  const router = useRouter();

  const [job, setJob] = useState(PRELOADED_JD);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestionSession, setSuggestionSession] = useState<SuggestionSession | null>(null);
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<"overview" | "suggestions" | "scannability" | "weaknesses" | "indiaFit" | "callbackTracker">("overview");
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);
  const [showAddTracker, setShowAddTracker] = useState(false);
  
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newStatus, setNewStatus] = useState<TrackerItem["status"]>("applied");
  const [newLink, setNewLink] = useState("");

  const [onboardingChecked, setOnboardingChecked] = useState({
    atsLayout: true,
    contactInfo: true,
    outcomeMetrics: false,
    noImages: true
  });

  // Modal capture states
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Trigger analysis on load automatically
  useEffect(() => {
    runAnalysis();
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setErrorMsg("");
    setSuggestionSession(null);

    try {
      const response = await fetch("/api/resume/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: PRELOADED_RESUME,
          jobDescription: PRELOADED_JD,
        }),
      });

      const payload = await response.json().catch(() => null) as SuggestPayload | null;
      if (!response.ok || !payload || payload.error) {
        throw new Error(payload?.error ?? "Could not generate resume suggestions.");
      }

      if (payload.data) {
        setSuggestionSession(payload.data);
        
        // Success score revealed! Wait 2 seconds and trigger the soft modal
        setTimeout(() => {
          setIsModalOpen(true);
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Optimization failed.");
    } finally {
      setLoading(false);
    }
  }

  const currentIntel = suggestionSession?.intelligence;

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
    setTrackerItems([item, ...trackerItems]);
    setNewCompany("");
    setNewRole("");
    setNewStatus("applied");
    setNewLink("");
    setShowAddTracker(false);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 p-4 pb-24 font-mono text-zinc-300 antialiased md:p-6 min-h-screen">
      
      {/* Dynamic Results Capture Modal */}
      <DemoResultModal isOpen={isModalOpen} onDismiss={() => setIsModalOpen(false)} />

      {/* HEADER SECTION */}
      <div className="border border-white/5 bg-zinc-950 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-violet-950 border border-violet-800 text-violet-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold uppercase tracking-tight text-white">
                RESUME INTELLIGENCE ENGINE V1.4
              </h1>
              <span className="bg-violet-900/50 border border-violet-800 text-[9px] px-1.5 py-0.5 text-violet-300 font-bold uppercase">
                GUEST MODE ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Deconstruct ATS constraints, analyze metric density, and alignment thresholds with recruiter heuristics.
            </p>
          </div>
        </div>

        {suggestionSession && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2"
          >
            Save results permanently
          </Button>
        )}
      </div>

      {/* SUGGESTION / AUDIT RESULTS PANEL */}
      {suggestionSession && (
        <div className="space-y-6">
          
          {/* Active Run Meta Bar */}
          <div className="flex flex-col gap-4 border border-white/5 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-500 uppercase">
                TARGET: <span className="font-bold text-white">Razorpay - Senior Software Engineer</span>
              </div>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/60 px-3 py-1 text-[10px] font-bold text-amber-400">
              SAMPLE PROFILE RUN (3 Yrs SDE @ TechMobility)
            </div>
          </div>

          {/* MAIN DOCK COCKPIT: Split into left metrics list and right content viewer */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            
            {/* LEFT BAR: Dashboard Perspectives Tabs */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all",
                  activeTab === "overview"
                    ? "border-violet-500 bg-violet-950/20 text-violet-400"
                    : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> 1. PROBABILITY COCKPIT
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                onClick={() => setActiveTab("suggestions")}
                className={cn(
                  "flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all",
                  activeTab === "suggestions"
                    ? "border-violet-500 bg-violet-950/20 text-violet-400"
                    : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" /> 2. LIVE FIELD SUGGESTIONS
                </span>
                <span className="bg-violet-900/50 border border-violet-800 text-[10px] px-1.5 text-violet-300 font-normal">
                  {suggestionSession.suggestions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("scannability")}
                className={cn(
                  "flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all",
                  activeTab === "scannability"
                    ? "border-violet-500 bg-violet-950/20 text-violet-400"
                    : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> 3. 6S EYE-TRACK SIMULATOR
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                onClick={() => setActiveTab("weaknesses")}
                className={cn(
                  "flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all",
                  activeTab === "weaknesses"
                    ? "border-violet-500 bg-violet-950/20 text-violet-400"
                    : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
                )}
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
                className={cn(
                  "flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all",
                  activeTab === "indiaFit"
                    ? "border-violet-500 bg-violet-950/20 text-violet-400"
                    : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> 5. INDIA TIER COMPLIANCE
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <button
                onClick={() => setActiveTab("callbackTracker")}
                className={cn(
                  "flex w-full items-center justify-between border p-3.5 text-left text-xs font-bold transition-all",
                  activeTab === "callbackTracker"
                    ? "border-violet-500 bg-violet-950/20 text-violet-400"
                    : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-white"
                )}
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
            <div className="border border-white/5 bg-zinc-950/40 p-6">
              
              {/* TAB 1: OVERVIEW & CALLBACK PROBABILITY */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-white flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-violet-400" /> CALLBACK PROBABILITY ANALYTICS
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Multi-variate projection of callback rates based on real recruiter response models in target tech brackets.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* Probability Ring Cards */}
                    <div className="border border-white/5 bg-zinc-950 p-6 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
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
                          <span className="text-[9px] text-zinc-500 uppercase mt-0.5">estimated</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal mt-4 max-w-xs">
                        Reflects current metric count, generic verbs, and key skill mismatch constraints.
                      </p>
                    </div>

                    <div className="border border-violet-500/20 bg-violet-950/5 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] font-black px-2 py-0.5 uppercase">
                        Projected
                      </div>
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-4">
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
                      <p className="text-[10px] text-violet-400/80 leading-normal mt-4 max-w-xs font-semibold">
                        Requires adopting all recommended outcome adjustments and tech keywords.
                      </p>
                    </div>
                  </div>

                  {/* Multi-Dimensional Audit Score Decomposition */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
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
                          <div key={key} className="border border-white/5 bg-zinc-950 p-4 text-xs font-mono">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-bold text-white">{labelMap[key] || key}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500">Baseline: {val.before}%</span>
                                <ChevronRight className="h-3 w-3 text-zinc-500" />
                                <span className="text-emerald-400 font-bold">Optimized: {val.after}%</span>
                              </div>
                            </div>
                            
                            {/* Sliders overlay */}
                            <div className="mt-2.5 bg-zinc-900 h-2 rounded relative border border-white/5">
                              <div className="bg-rose-500 h-full rounded absolute" style={{ width: `${val.before}%` }} />
                              <div className="bg-emerald-500/50 h-full rounded absolute" style={{ left: `${val.before}%`, width: `${val.after - val.before}%` }} />
                            </div>
                            
                            <p className="mt-2.5 text-[10px] text-zinc-500 leading-normal">
                              {val.feedback}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE FIELD SUGGESTIONS EDITOR */}
              {activeTab === "suggestions" && (
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-tight text-white">
                        FIELD-LEVEL SUGGESTION TUNER
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Inspect, edit, and apply precision adjustments directly to your active resume snapshot.
                      </p>
                    </div>
                  </div>
                  
                  <SuggestionEditor
                    session={suggestionSession}
                    persist={false}
                    onApplied={(updatedResume) => {
                      // Live simulation in demo mode
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
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-white flex items-center gap-2">
                      <Eye className="h-5 w-5 text-violet-400" /> 6-SECOND EYE-TRACK SIMULATOR
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Recruiters scan resumes for an average of 6 seconds. Hover over the highlighted sectors below to see recruiter psychological responses.
                    </p>
                  </div>

                  {/* Simulator Screen */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* Simulated Resume Layout */}
                    <div className="border border-white/10 bg-white text-slate-800 p-6 font-sans text-[10px] relative shadow-lg max-h-[500px] overflow-y-auto">
                      
                      {/* Highlighted Block 1: Header */}
                      <div className="border border-dashed border-violet-400 bg-violet-50/70 p-2.5 mb-4 group cursor-pointer relative transition-all hover:bg-violet-100/80">
                        <div className="absolute top-0 right-0 bg-violet-500 text-white text-[8px] px-1 font-bold">1.5s scan</div>
                        <h4 className="font-bold text-xs uppercase tracking-tight text-slate-900">
                          {suggestionSession.resumeSnapshot.personal.name}
                        </h4>
                        <p className="text-slate-500 text-[8px] mt-0.5">{suggestionSession.resumeSnapshot.personal.email} | {suggestionSession.resumeSnapshot.personal.phone}</p>
                        <p className="text-slate-600 mt-2 leading-relaxed">
                          {suggestionSession.resumeSnapshot.personal.summary}
                        </p>
                        {/* Recruiter Annotation tooltip */}
                        <div className="hidden group-hover:block absolute left-2 -bottom-20 z-10 w-[240px] bg-slate-900 text-white p-2.5 font-mono text-[9px] leading-relaxed border border-violet-400 shadow-md">
                          <span className="font-bold text-violet-400 uppercase">HEURISTIC 1:</span> Checks for target location boundaries and evaluates keyword match alignment.
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
                          <span>{suggestionSession.resumeSnapshot.experience[0]?.company || "TechMobility"}</span>
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
                    <div className="space-y-4 font-mono">
                      <div className="border border-white/5 bg-zinc-950 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase">Estimated Scan Speed</span>
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-violet-400" />
                          <span className="text-base font-bold text-white">
                            {currentIntel?.recruiterScannability.scanTimeSeconds ?? 6.2} seconds
                          </span>
                        </div>
                      </div>

                      <div className="border border-white/5 bg-zinc-950 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase">Readability Index</span>
                        <div className="mt-1 flex items-center gap-2">
                          <Award className="h-4 w-4 text-emerald-400" />
                          <span className="text-base font-bold text-white">
                            {currentIntel?.recruiterScannability.readabilityScore ?? 70}/100 (Optimal)
                          </span>
                        </div>
                      </div>

                      <div className="border border-white/5 bg-zinc-950 p-4 space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">What Recruiter Remembers</span>
                        <ul className="space-y-1.5">
                          {currentIntel?.recruiterScannability.topTakeaways.map((item, idx) => (
                            <li key={idx} className="text-[10px] text-zinc-300 flex items-start gap-1.5">
                              <span className="text-violet-400 shrink-0">▪</span> {item}
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
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" /> RESUME FRICTION ANALYSIS
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Actionable catalog of structural weaknesses that increase dropoff rates in recruiter filters.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {currentIntel?.weaknesses && currentIntel.weaknesses.length > 0 ? (
                      currentIntel.weaknesses.map((item) => (
                        <div key={item.id} className={cn(
                          "border p-4 font-mono text-xs",
                          item.severity === "critical" 
                            ? "border-red-900 bg-red-950/10 text-red-200" 
                            : "border-amber-900 bg-amber-950/10 text-amber-200"
                        )}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-widest text-[10px]">
                              {item.severity.toUpperCase()} SEVERITY
                            </span>
                            <span className="bg-black/40 px-2 py-0.5 border border-white/5 text-[9px]">
                              SECTION: {item.section.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="mt-2 text-xs font-bold text-white">
                            {item.issue}
                          </p>

                          <div className="mt-2.5 bg-black/30 p-2.5 border border-white/5 text-[10px] text-zinc-400">
                            <strong className="text-white uppercase tracking-widest block mb-1">RECRUITER REMEDY:</strong>
                            {item.recommendation}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 border border-dashed border-white/5 text-zinc-500 text-xs">
                        No critical friction points detected. Resume is highly aligned.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: INDIA TIER COMPLIANCE & MARKET FIT */}
              {activeTab === "indiaFit" && (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-base font-bold uppercase tracking-tight text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-violet-400" /> INDIA MARKET FIT & TIER COMPLIANCE
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Aligns resume credentials with standard tier boundaries in the Indian hiring environment.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
                    
                    {/* India Market Tier Card */}
                    <div className="border border-white/5 bg-[#0e1117] p-6 space-y-4 font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase">Evaluated Tier Bracket</span>
                        <div className="mt-1 flex items-center gap-2 text-violet-400 font-bold text-base">
                          <Layers className="h-5 w-5" />
                          <span>{currentIntel?.indiaMarketFit.tierMatch ?? "Tier-2 Product Org"}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase">Target Compatibility Match</span>
                        <div className="mt-1 flex items-end gap-1.5 font-bold">
                          <span className="text-2xl text-white">{currentIntel?.indiaMarketFit.targetMatchPercentage ?? 70}%</span>
                          <span className="text-xs text-zinc-500 mb-1">fit ratio</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Local Indian Skills Gaps</span>
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
                    <div className="border border-white/5 bg-[#0e1117] p-6 space-y-3 font-mono">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">
                        STEPS TO UPGRADE TIER INDEX
                      </span>
                      
                      <div className="space-y-2.5">
                        {currentIntel?.indiaMarketFit.recommendedSteps.map((stepText, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-500">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-violet-800 text-[10px] font-black text-violet-400">
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
                  <div className="border-b border-white/5 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-tight text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-400" /> APPLICATION DISPATCH TRACKER
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">
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
                      className="border border-white/5 bg-[#0e1117] p-4 space-y-4 text-xs font-mono"
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Company Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Swiggy"
                            value={newCompany}
                            onChange={e => setNewCompany(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 p-2 text-white focus:outline-none focus:border-violet-400"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold">Role Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Senior Backend Engineer"
                            value={newRole}
                            onChange={e => setNewRole(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 p-2 text-white focus:outline-none focus:border-violet-400"
                          />
                        </div>
                      </div>

                      <Button type="submit" className="h-8 rounded-none bg-violet-600 text-white font-bold hover:bg-violet-700 text-xs">
                        SAVE TRACKING LOG
                      </Button>
                    </motion.form>
                  )}

                  {/* Submission Logs List */}
                  <div className="space-y-3">
                    {trackerItems.length > 0 ? (
                      trackerItems.map((item) => {
                        return (
                          <div key={item.id} className="border border-white/5 bg-[#0e1117] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-mono">
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{item.company}</span>
                                <span className="text-[10px] text-zinc-500">({item.role})</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                <span>Sent: {item.appliedDate}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className="border border-violet-800 bg-violet-950/20 text-violet-400 text-[10px] font-bold px-2 py-0.5 uppercase">
                                {item.status}
                              </span>
                              <button
                                onClick={() => setTrackerItems(trackerItems.filter(x => x.id !== item.id))}
                                className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-10 border border-dashed border-white/5 text-xs text-zinc-500">
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

      {/* BUSY LOADING STATE */}
      {loading && (
        <div className="border border-white/5 bg-[#0b0d13] p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[350px]">
          <div className="relative">
            <Wand2 className="h-10 w-10 text-violet-400 animate-spin" />
            <div className="absolute inset-0 h-10 w-10 border border-dashed border-violet-500 rounded-full animate-ping opacity-30" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-white">Executing Semantic Compliance Check</h3>
            <p className="text-[10px] text-zinc-500 max-w-md leading-relaxed">
              Deconstructing resume, mapping skill hierarchies, and simulating recruiter eye-tracking...
            </p>
          </div>
        </div>
      )}

      {/* API ERROR DISPLAY */}
      {errorMsg && (
        <div className="border border-red-900 bg-red-950/10 p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="text-xs font-bold text-red-400 uppercase">Analysis Interrupted</h3>
            <p className="text-[10px] text-red-300 leading-normal">{errorMsg}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-none border-red-800 bg-transparent text-red-400 text-[10px] font-bold hover:bg-red-950/20 mt-1"
              onClick={runAnalysis}
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
            demoScore: true,
            score: suggestionSession.intelligence?.callbackProbability?.after ?? 82,
          }}
        />
      )}

    </div>
  );
}
