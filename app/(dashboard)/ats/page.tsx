"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, FileText, Sparkles, TrendingUp, Wand2, Zap } from "lucide-react";
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

type OptimizationStep = "idle" | "analyzing" | "done" | "error";

const STEP_LABELS: Record<OptimizationStep, string> = {
  idle: "",
  analyzing: "Analyzing your resume against the job description...",
  done: "Done!",
  error: "Something went wrong",
};

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
    },
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

type SuggestPayload = {
  data?: SuggestionSession | {
    session?: SuggestionSession;
    suggestions?: ResumeSuggestion[];
    matchScoreBefore?: number;
    matchScoreAfter?: number;
  };
  suggestions?: ResumeSuggestion[];
  matchScoreBefore?: number;
  matchScoreAfter?: number;
  error?: string | null;
};

function makeClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `suggestions-${Date.now()}`;
}

function isSuggestionSession(value: unknown): value is SuggestionSession {
  return Boolean(
    value &&
    typeof value === "object" &&
    "resumeSnapshot" in value &&
    Array.isArray((value as SuggestionSession).suggestions),
  );
}

function buildSessionFromPayload(
  payload: SuggestPayload,
  resume: ResumeData,
  jobDescription: string,
  resumeId?: string,
): SuggestionSession {
  if (isSuggestionSession(payload.data)) return payload.data;

  if (payload.data && "session" in payload.data && isSuggestionSession(payload.data.session)) {
    return {
      ...payload.data.session,
      suggestions: payload.data.suggestions ?? payload.data.session.suggestions,
    };
  }

  const dataSuggestions = payload.data && "suggestions" in payload.data ? payload.data.suggestions : undefined;
  const suggestions = dataSuggestions ?? payload.suggestions ?? [];
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error("No suggestions were returned for this resume.");
  }

  const before = payload.data && "matchScoreBefore" in payload.data
    ? payload.data.matchScoreBefore
    : payload.matchScoreBefore;
  const after = payload.data && "matchScoreAfter" in payload.data
    ? payload.data.matchScoreAfter
    : payload.matchScoreAfter;
  const now = new Date().toISOString();

  return {
    id: makeClientId(),
    ...(resumeId ? { resumeId } : {}),
    source: "api",
    createdAt: now,
    updatedAt: now,
    jobDescription,
    resumeSnapshot: resume,
    suggestions,
    ...(typeof before === "number" && typeof after === "number" ? { scores: { before, after } } : {}),
    persisted: false,
  };
}

function LoadingAnalysis() {
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-100/40">
      <div className="flex items-center gap-3 text-indigo-700">
        <Wand2 className="h-6 w-6 animate-spin" />
        <p className="text-lg font-black">{STEP_LABELS.analyzing}</p>
      </div>
      <div className="mt-6 space-y-4">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-indigo-100" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
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

  const hydrated = useRef(false);
  useEffect(() => {
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

  const resume = useMemo(() => {
    const selected = selectedId ? resumesById[selectedId] : undefined;
    return selected ? normalizeResume(selected) : null;
  }, [resumesById, selectedId]);

  const isBusy = step === "analyzing";

  async function requestSuggestions(targetResume: ResumeData, targetJob: string, isDemo: boolean) {
    setStep("analyzing");
    setErrorMsg("");
    setIsDemoMode(isDemo);
    setSuggestionSession(null);

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

      setSuggestionSession(buildSessionFromPayload(payload, targetResume, targetJob, activeResumeId));
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

  if (error) {
    return (
      <div className="m-8 flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 font-bold text-rose-500">
        {error}
      </div>
    );
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <div className="text-sm font-medium text-gray-400">Initializing Analysis Engine...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 pb-24 font-sans md:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 flex items-center justify-center gap-3 text-4xl font-black tracking-tight text-gray-900 md:text-5xl">
          <TrendingUp className="h-10 w-10 text-indigo-600 md:h-12 md:w-12" /> Application Engine
        </h1>
        <p className="text-lg font-medium text-gray-600 md:text-xl">
          Review precise AI resume suggestions against a target job description before applying changes.
        </p>
      </div>

      {suggestionSession && (
        <div className="space-y-5">
          <Button
            variant="outline"
            onClick={() => setSuggestionSession(null)}
            className="bg-white font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to analysis
          </Button>

          {isDemoMode && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-100 p-4 font-black text-amber-800 shadow-sm">
              <Zap className="h-5 w-5" /> This is a demo result, not your actual resume.
            </div>
          )}

          <SuggestionEditor
            session={suggestionSession}
            persist={!isDemoMode}
            onApplied={(updatedResume) => {
              upsertResume(updatedResume, true);
              setSuggestionSession(null);
            }}
          />
        </div>
      )}

      {!suggestionSession && resumes.length === 0 && !isBusy && (
        <div className="mx-auto max-w-3xl rounded-3xl border-2 border-dashed border-gray-200 bg-white p-16 text-center shadow-sm">
          <FileText className="mx-auto mb-6 h-16 w-16 text-gray-300" />
          <p className="mb-6 text-xl font-bold text-gray-500">No resumes found. Create your base resume first.</p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg font-black" onClick={() => router.push("/builder")}>
              Create Resume
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-2 border-amber-200 bg-amber-50 px-8 text-lg font-bold text-amber-700 hover:bg-amber-100"
              onClick={handleDemo}
            >
              <Zap className="h-5 w-5" /> Try Demo
            </Button>
          </div>
        </div>
      )}

      {!suggestionSession && resumes.length > 0 && !isBusy && (
        <div className="mx-auto max-w-3xl space-y-8 rounded-3xl border bg-white p-8 shadow-2xl shadow-indigo-100/50 md:p-10">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">1</span>
              Select Base Resume
            </label>
            <select
              className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 text-lg font-bold text-gray-800 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Choose a resume</option>
              {resumes.filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">2</span>
              Paste Target Job Description
            </label>
            <textarea
              className="w-full resize-none rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 text-base font-medium text-gray-800 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={8}
              value={job}
              onChange={(event) => setJob(event.target.value)}
              placeholder="Paste the full job description here. The AI will return editable, field-level resume suggestions."
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              onClick={handleAnalyze}
              disabled={!resume || !job.trim() || isBusy}
              size="lg"
              className="h-16 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xl font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl sm:w-2/3"
            >
              <Sparkles className="h-6 w-6" /> Optimize
            </Button>

            <Button
              onClick={handleDemo}
              disabled={isBusy}
              variant="outline"
              size="lg"
              className="h-16 w-full rounded-2xl border-2 border-amber-200 bg-amber-50 text-lg font-bold text-amber-700 transition-all hover:bg-amber-100 sm:w-1/3"
            >
              <Zap className="h-5 w-5" /> Try Demo
            </Button>
          </div>
        </div>
      )}

      {!suggestionSession && isBusy && <LoadingAnalysis />}

      {!suggestionSession && step === "error" && (
        <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-bold text-red-800">Optimization failed</p>
            <p className="mt-1 text-sm text-red-600">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStep("idle")}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
