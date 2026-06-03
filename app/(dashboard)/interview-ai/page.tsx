"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Send,
  UploadCloud,
  X,
} from "lucide-react";

import { RESUME_SOURCES } from "@/lib/constants/resume-sources";

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type SourceMode = "paste" | "upload" | "careeros" | "url" | "application";
type Tab = "setup" | "profile" | "mock" | "analytics";

type CompanyOption = {
  id: string;
  name: string;
  normalizedName?: string;
  slug?: string;
  companyType?: string | null;
  tier?: string | null;
  industry?: string | null;
  intelligence?: Record<string, unknown>;
  isTypedOption?: boolean;
};

type ResumeProfile = {
  source: string;
  rawText: string;
  summary: string | null;
  skills: string[];
  experienceSignals: string[];
  senioritySignals: string[];
  projectSignals: string[];
};

type JobDescriptionProfile = {
  source: string;
  rawText: string;
  skills: string[];
  requirements: string[];
  responsibilities: string[];
  signals: string[];
  keywords: string[];
  seniority: string | null;
};

type ReadinessComponent = {
  key: string;
  label: string;
  score: number | null;
  explanation: string;
};

type BlueprintRound = {
  roundNumber: number;
  name: string;
  type: string;
  durationMinutes: number;
  focusAreas: string[];
  expectedSignals: string[];
};

type InterviewProfile = {
  sessionId: string;
  companyProfile: {
    name: string;
    slug: string;
    industry: string | null;
    tier: string | null;
    evidence: string[];
  };
  roleProfile: {
    title: string;
    experienceLevel: string;
    targetLocation: string | null;
    seniority: string | null;
    keyTechnicalAreas: string[];
  };
  salaryRange: null | {
    currency: string;
    min: number | null;
    median: number | null;
    max: number | null;
    confidence: number;
    source: string;
  };
  readiness: {
    overallScore: number;
    status: "provisional" | "mock_calibrated";
    components: ReadinessComponent[];
    formula: string;
    missingInputs: string[];
  };
  blueprint: {
    source: string;
    difficultyScore: number;
    confidence: number;
    rounds: BlueprintRound[];
    focusAreas: string[];
    behavioralFocusAreas: string[];
    communicationExpectations: string[];
    expectedHiringTimeline: string | null;
  };
  preparationPriorities: string[];
  roadmap: {
    sevenDayPlan: string[];
    fourteenDayPlan: string[];
    thirtyDayPlan: string[];
    ninetyDayPlan: string[];
  };
  analytics: {
    readinessTrend: Array<{ date: string; score: number }>;
    mockTrend: Array<{ date: string; score: number }>;
    communicationTrend: Array<{ date: string; score: number }>;
  };
};

type TranscriptTurn = {
  speaker: "interviewer" | "candidate";
  text: string;
  timestamp?: string;
  evaluation?: AnswerEvaluation;
};

type AnswerEvaluation = {
  overall: number;
  communication: number;
  technicalDepth: number;
  correctness: number;
  tradeoffs: number;
  confidence: number;
  completeness: number;
  strengths: string[];
  improvements: string[];
};

type MockEvaluation = {
  score: number;
  summary: string;
  rubric: Record<string, { score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  nextDrill: string | null;
  readiness?: InterviewProfile["readiness"];
  roadmap?: InterviewProfile["roadmap"];
};

async function readApi<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("InterviewAI API Error", response.status, errorText);
    throw new Error(`API ${response.status}: ${errorText}`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!("data" in payload)) throw new Error("CareerOS returned an unexpected response.");
  return payload.data as T;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500">Needs data</span>;
  }
  return <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">{score}%</span>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 leading-6">{body}</p>
    </div>
  );
}

function sourceLabel(mode: SourceMode) {
  if (mode === "careeros") return "CareerOS Resume";
  if (mode === "application") return "Saved Application";
  if (mode === "url") return "Job URL";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function InterviewAIPage() {
  const [activeTab, setActiveTab] = useState<Tab>("setup");
  const [companySearch, setCompanySearch] = useState("");
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [compensationTarget, setCompensationTarget] = useState("");

  const [resumeMode, setResumeMode] = useState<SourceMode>("paste");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [userResumes, setUserResumes] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);

  const [jdMode, setJdMode] = useState<SourceMode>("paste");
  const [jobDescription, setJobDescription] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [jdProfile, setJdProfile] = useState<JobDescriptionProfile | null>(null);

  const [profile, setProfile] = useState<InterviewProfile | null>(null);
  const [mockTranscript, setMockTranscript] = useState<TranscriptTurn[]>([]);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [mockStatus, setMockStatus] = useState<"idle" | "starting" | "active" | "evaluating" | "completed">("idle");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentFocus, setCurrentFocus] = useState<string | null>(null);
  const [persona, setPersona] = useState<string | null>(null);
  const [latestAnswerEvaluation, setLatestAnswerEvaluation] = useState<AnswerEvaluation | null>(null);
  const [mockEvaluation, setMockEvaluation] = useState<MockEvaluation | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const searchCompanies = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setCompanyOptions([]);
      return;
    }
    setCompanyLoading(true);
    try {
      const response = await fetch(`/api/v1/interview-intelligence/companies?q=${encodeURIComponent(trimmed)}`);
      setCompanyOptions(await readApi<CompanyOption[]>(response));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Company search failed.");
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCompany) return;
    const timer = window.setTimeout(() => {
      void searchCompanies(companySearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [companySearch, searchCompanies, selectedCompany]);

  useEffect(() => {
    if (resumeMode !== "careeros") return;
    
    const fetchResumes = async () => {
      setIsLoadingResumes(true);
      setError("");
      try {
        const response = await fetch("/api/v1/resumes");
        const list = await readApi<Array<{ id: string; title: string }>>(response);
        setUserResumes(list);
        if (list && list.length > 0 && list[0]) {
          setResumeId(list[0].id);
        } else {
          setNotice("No resume found in Resume Builder.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Resumes from builder.");
      } finally {
        setIsLoadingResumes(false);
      }
    };
    
    void fetchResumes();
  }, [resumeMode]);

  const canGenerate = useMemo(
    () => Boolean(selectedCompany && roleTitle.trim() && experienceLevel.trim()),
    [experienceLevel, roleTitle, selectedCompany]
  );

  const parseResume = useCallback(async () => {
    setError("");
    setNotice("");
    setBusyAction("resume");
    setLoadingStep("Analyzing Resume...");
    console.log("Selected Resume Source:", resumeMode);
    
    const timer1 = setTimeout(() => setLoadingStep("Extracting Text..."), 1500);
    const timer2 = setTimeout(() => setLoadingStep("Running OCR..."), 4000);
    
    try {
      let parsed: ResumeProfile;
      if (resumeMode === "upload") {
        if (!resumeFile) throw new ValidationError("Choose a PDF or DOCX resume first.");
        const form = new FormData();
        form.append("file", resumeFile);
        parsed = await readApi<ResumeProfile>(await fetch("/api/v1/interview-ai/resume-source", { method: "POST", body: form }));
      } else if (resumeMode === "careeros") {
        if (!resumeId) throw new ValidationError("Please select a CareerOS resume first.");
        parsed = await readApi<ResumeProfile>(
          await fetch("/api/v1/interview-ai/resume-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceType: RESUME_SOURCES.CAREER_OS, resumeId }),
          })
        );
      } else {
        if (!resumeText.trim() || resumeText.length < 80) throw new ValidationError("Paste at least 80 characters of resume content.");
        parsed = await readApi<ResumeProfile>(
          await fetch("/api/v1/interview-ai/resume-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceType: RESUME_SOURCES.PASTE, resumeText }),
          })
        );
      }
      setResumeProfile(parsed);
      setNotice("Resume profile parsed and normalized.");
      return parsed;
    } catch (parseError) {
      const isValidation = parseError instanceof Error && parseError.name === "ValidationError";
      if (!isValidation) console.error("[parseResume frontend error]", parseError);
      const errMsg = parseError instanceof Error ? parseError.message : "";
      if (
        errMsg.includes("requiresOCR") ||
        errMsg.includes("couldn't read this file") ||
        errMsg.includes("Unable to extract text")
      ) {
        setError("We couldn't read this file. Please upload another PDF, DOCX, or paste resume content.");
      } else {
        setError(parseError instanceof Error ? parseError.message : "Resume parsing failed.");
      }
      return null;
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoadingStep(null);
      setBusyAction(null);
    }
  }, [resumeFile, resumeId, resumeMode, resumeText]);

  const parseJd = useCallback(async () => {
    setError("");
    setNotice("");
    setBusyAction("jd");
    setLoadingStep("Analyzing Resume...");
    
    const timer1 = setTimeout(() => setLoadingStep("Extracting Text..."), 1500);
    const timer2 = setTimeout(() => setLoadingStep("Running OCR..."), 4000);
    
    try {
      let parsed: JobDescriptionProfile;
      if (jdMode === "upload") {
        if (!jdFile) throw new ValidationError("Choose a PDF or DOCX job description file first.");
        const form = new FormData();
        form.append("file", jdFile);
        parsed = await readApi<JobDescriptionProfile>(await fetch("/api/v1/interview-ai/jd-source", { method: "POST", body: form }));
      } else if (jdMode === "url") {
        if (!jobUrl.trim()) throw new ValidationError("Paste a job posting URL first.");
        try { new URL(jobUrl); } catch { throw new ValidationError("Enter a valid URL (e.g. https://company.com/jobs/role)."); }
        parsed = await readApi<JobDescriptionProfile>(
          await fetch("/api/v1/interview-ai/jd-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceType: "url", jobUrl }),
          })
        );
      } else if (jdMode === "application") {
        if (!applicationId.trim()) throw new ValidationError("Enter a saved application ID first.");
        parsed = await readApi<JobDescriptionProfile>(
          await fetch("/api/v1/interview-ai/jd-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceType: "application", applicationId }),
          })
        );
      } else {
        if (!jobDescription.trim() || jobDescription.trim().split(/\s+/).filter(Boolean).length < 5)
          throw new ValidationError("Paste at least 5 words of job description.");
        parsed = await readApi<JobDescriptionProfile>(
          await fetch("/api/v1/interview-ai/jd-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceType: "paste", jobDescription }),
          })
        );
      }
      setJdProfile(parsed);
      setNotice("Job description parsed into skills, requirements, and hiring signals.");
      return parsed;
    } catch (parseError) {
      const isValidation = parseError instanceof Error && parseError.name === "ValidationError";
      if (!isValidation) console.error("[parseJd frontend error]", parseError);
      const errMsg = parseError instanceof Error ? parseError.message : "";
      // Only show the file-read fallback message for genuine OCR/file-parse failures,
      // not for validation errors (short JD, bad URL, etc.) which have their own messages.
      if (
        errMsg.includes("requiresOCR") ||
        errMsg.includes("couldn't read this file") ||
        errMsg.includes("Unable to extract text")
      ) {
        setError("We couldn't read this file. Please upload another PDF, DOCX, or paste the job description.");
      } else {
        setError(parseError instanceof Error ? parseError.message : "JD parsing failed.");
      }
      return null;
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoadingStep(null);
      setBusyAction(null);
    }
  }, [applicationId, jdFile, jdMode, jobDescription, jobUrl]);

  const generateProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selectedCompany) {
      setError("Select a company or use the typed company option from search.");
      return;
    }
    if (!canGenerate) {
      setError("Company, role, and experience are required.");
      return;
    }

    setBusyAction("profile");
    setLoadingStep("Generating Candidate Profile...");
    const timer = setTimeout(() => setLoadingStep("Building Interview Blueprint..."), 2500);
    try {
      const resume = resumeProfile ?? (await parseResume());
      if (!resume) return;
      const jd = jdProfile ?? (await parseJd());
      if (!jd) return;
      const nextProfile = await readApi<InterviewProfile>(
        await fetch("/api/v1/interview-ai/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setup: {
              companyName: selectedCompany.name,
              roleTitle,
              experienceLevel,
              targetLocation,
              compensationTarget,
            },
            resume,
            jd,
          }),
        })
      );
      setProfile(nextProfile);
      setMockTranscript([]);
      setMockEvaluation(null);
      setLatestAnswerEvaluation(null);
      setMockStatus("idle");
      setActiveTab("profile");
      setNotice("Interview intelligence profile generated from stored resume and JD signals.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Profile generation failed.");
    } finally {
      clearTimeout(timer);
      setLoadingStep(null);
      setBusyAction(null);
    }
  };

  const startMock = async () => {
    if (!profile) return;
    setError("");
    setBusyAction("mock-start");
    setMockStatus("starting");
    try {
      const started = await readApi<{
        sessionId: string;
        nextQuestion: string;
        focusTopic: string | null;
        personaState: string | null;
        transcript: TranscriptTurn[];
      }>(
        await fetch("/api/v1/interview-intelligence/mock/adaptive-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: profile.sessionId,
            roleTitle: profile.roleProfile.title,
            companyName: profile.companyProfile.name,
          }),
        })
      );
      setCurrentQuestion(started.nextQuestion);
      setCurrentFocus(started.focusTopic);
      setPersona(started.personaState);
      setMockTranscript(started.transcript);
      setMockStatus("active");
      setActiveTab("mock");
    } catch (mockError) {
      setMockStatus("idle");
      setError(mockError instanceof Error ? mockError.message : "Mock interview failed to start.");
    } finally {
      setBusyAction(null);
    }
  };

  const submitAnswer = async () => {
    if (!profile || !candidateAnswer.trim()) return;
    const answer = candidateAnswer.trim();
    setCandidateAnswer("");
    setError("");
    setBusyAction("mock-answer");
    try {
      const result = await readApi<{
        answerEvaluation: AnswerEvaluation;
        nextQuestion: string | null;
        focusTopic: string | null;
        personaState: string | null;
        isInterviewComplete: boolean;
        transcript: TranscriptTurn[];
      }>(
        await fetch("/api/v1/interview-intelligence/mock/adaptive-respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: profile.sessionId, candidateResponse: answer }),
        })
      );
      setLatestAnswerEvaluation(result.answerEvaluation);
      setMockTranscript(result.transcript);
      setCurrentQuestion(result.nextQuestion ?? "");
      setCurrentFocus(result.focusTopic);
      setPersona(result.personaState);
      if (result.isInterviewComplete) setMockStatus("evaluating");
    } catch (mockError) {
      setError(mockError instanceof Error ? mockError.message : "Could not process that answer.");
      setCandidateAnswer(answer);
    } finally {
      setBusyAction(null);
    }
  };

  const finishMock = async () => {
    if (!profile) return;
    setError("");
    setBusyAction("mock-evaluate");
    setMockStatus("evaluating");
    try {
      const evaluation = await readApi<MockEvaluation>(
        await fetch("/api/v1/interview-intelligence/mock/adaptive-evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: profile.sessionId }),
        })
      );
      setMockEvaluation(evaluation);
      if (evaluation.readiness || evaluation.roadmap) {
        setProfile((current) =>
          current
            ? {
                ...current,
                readiness: evaluation.readiness ?? current.readiness,
                roadmap: evaluation.roadmap ?? current.roadmap,
              }
            : current
        );
      }
      setMockStatus("completed");
    } catch (mockError) {
      setMockStatus("active");
      setError(mockError instanceof Error ? mockError.message : "Evaluation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      {loadingStep && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-sm text-white">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center p-6 bg-slate-950/40 rounded-2xl border border-slate-800">
            <Loader2 className="h-10 w-10 animate-spin text-slate-100" />
            <p className="text-lg font-medium tracking-normal text-slate-100">{loadingStep}</p>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-slate-100 rounded-full animate-pulse" style={{ width: "60%" }}></div>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Briefcase className="h-4 w-4" />
              InterviewAI V4
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Interview Intelligence OS</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Build a company, role, resume, and JD specific interview operating plan. Scores and analytics appear only after CareerOS has enough stored evidence.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-1 md:flex">
            {[
              ["setup", "Setup"],
              ["profile", "Blueprint"],
              ["mock", "Mock"],
              ["analytics", "Analytics"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={id !== "setup" && !profile}
                onClick={() => setActiveTab(id as Tab)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                  activeTab === id
                    ? "bg-slate-950 text-white"
                    : id !== "setup" && !profile
                      ? "cursor-not-allowed text-slate-400"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {(error || notice) && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-4 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
            <span>{error || notice}</span>
          </div>
        )}

        {activeTab === "setup" && (
          <form onSubmit={generateProfile} className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <Section title="Hiring Setup" icon={Building2}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">Company</label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        value={selectedCompany ? selectedCompany.name : companySearch}
                        onChange={(event) => {
                          setSelectedCompany(null);
                          setCompanySearch(event.target.value);
                        }}
                        placeholder="Search any company hiring in India"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm outline-none focus:border-slate-700"
                      />
                      {selectedCompany && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(null);
                            setCompanySearch("");
                          }}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-900"
                          aria-label="Clear company"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {!selectedCompany && companySearch.trim().length >= 2 && (
                      <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {companyLoading ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching companies
                          </div>
                        ) : companyOptions.length ? (
                          companyOptions.map((company) => (
                            <button
                              type="button"
                              key={company.id}
                              onClick={() => {
                                setSelectedCompany(company);
                                setCompanySearch("");
                              }}
                              className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50"
                            >
                              <span>
                                <span className="block font-semibold text-slate-900">{company.name}</span>
                                <span className="block text-xs text-slate-500">
                                  {company.isTypedOption ? "Use typed company" : [company.industry, company.tier].filter(Boolean).join(" / ") || "Stored company"}
                                </span>
                              </span>
                              <Building2 className="h-4 w-4 text-slate-400" />
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500">No company matches yet. Keep typing to use a custom target.</div>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Role</span>
                    <input
                      value={roleTitle}
                      onChange={(event) => setRoleTitle(event.target.value)}
                      placeholder="Target role title"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Experience</span>
                    <select
                      value={experienceLevel}
                      onChange={(event) => setExperienceLevel(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                    >
                      <option value="">Select experience level</option>
                      <option value="fresher">Fresher</option>
                      <option value="0-2 years">0-2 years</option>
                      <option value="3-5 years">3-5 years</option>
                      <option value="6-9 years">6-9 years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Target Location</span>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        value={targetLocation}
                        onChange={(event) => setTargetLocation(event.target.value)}
                        placeholder="City, remote, or hybrid preference"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-700"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Compensation Target</span>
                    <input
                      value={compensationTarget}
                      onChange={(event) => setCompensationTarget(event.target.value)}
                      placeholder="Optional target"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                    />
                  </label>
                </div>
              </Section>

              <Section title="Resume Source" icon={FileText}>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(["paste", "upload", "careeros"] as SourceMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setResumeMode(mode)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${resumeMode === mode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
                    >
                      {sourceLabel(mode)}
                    </button>
                  ))}
                </div>
                {resumeMode === "upload" ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                    <UploadCloud className="mb-2 h-5 w-5" />
                    <span>{resumeFile?.name || "Upload PDF or DOCX resume"}</span>
                    <input type="file" accept=".pdf,.docx,application/pdf" className="hidden" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} />
                  </label>
                ) : resumeMode === "careeros" ? (
                  isLoadingResumes ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                      <span>Loading resumes from Resume Builder...</span>
                    </div>
                  ) : userResumes.length > 0 ? (
                    <select
                      value={resumeId}
                      onChange={(event) => setResumeId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700 cursor-pointer"
                    >
                      {userResumes.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.title || "Untitled Resume"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      No resume found in Resume Builder.
                    </div>
                  )
                ) : (
                  <textarea
                    value={resumeText}
                    onChange={(event) => {
                      setResumeText(event.target.value);
                      setResumeProfile(null);
                    }}
                    placeholder="Paste resume text"
                    className="min-h-44 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                  />
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">{resumeProfile ? `${resumeProfile.skills.length} skills extracted from ${resumeProfile.source}.` : "Resume profile is not parsed yet."}</p>
                  <button type="button" onClick={() => { parseResume().catch(() => undefined); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                    {busyAction === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse Resume"}
                  </button>
                </div>
              </Section>
            </div>

            <div className="space-y-5">
              <Section title="JD Source" icon={ClipboardList}>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(["paste", "upload", "url", "application"] as SourceMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setJdMode(mode)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${jdMode === mode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
                    >
                      {sourceLabel(mode)}
                    </button>
                  ))}
                </div>
                {jdMode === "upload" ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                    <UploadCloud className="mb-2 h-5 w-5" />
                    <span>{jdFile?.name || "Upload JD PDF or DOCX"}</span>
                    <input type="file" accept=".pdf,.docx,application/pdf" className="hidden" onChange={(event) => setJdFile(event.target.files?.[0] ?? null)} />
                  </label>
                ) : jdMode === "url" ? (
                  <input
                    value={jobUrl}
                    onChange={(event) => setJobUrl(event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                  />
                ) : jdMode === "application" ? (
                  <input
                    value={applicationId}
                    onChange={(event) => setApplicationId(event.target.value)}
                    placeholder="Saved application ID"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                  />
                ) : (
                  <textarea
                    value={jobDescription}
                    onChange={(event) => {
                      setJobDescription(event.target.value);
                      setJdProfile(null);
                    }}
                    placeholder="Paste job description"
                    className="min-h-44 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                  />
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">{jdProfile ? `${jdProfile.skills.length} skills and ${jdProfile.keywords.length} keywords extracted.` : "JD profile is not parsed yet."}</p>
                  <button type="button" onClick={() => { parseJd().catch(() => undefined); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                    {busyAction === "jd" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse JD"}
                  </button>
                </div>
              </Section>

              <Section title="Generate Intelligence Profile" icon={Award}>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>CareerOS will create a persisted interview session, normalized resume/JD profiles, expected rounds, readiness formula trace, and personalized roadmap.</p>
                  <button
                    type="submit"
                    disabled={!canGenerate || busyAction !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {busyAction === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                    Generate Profile
                  </button>
                </div>
              </Section>
            </div>
          </form>
        )}

        {activeTab === "profile" && profile && (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Section title="Intelligence Profile" icon={Award}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Company</p>
                  <p className="mt-1 font-semibold">{profile.companyProfile.name}</p>
                  <p className="text-sm text-slate-600">{profile.companyProfile.industry || "No stored company intelligence yet"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
                  <p className="mt-1 font-semibold">{profile.roleProfile.title}</p>
                  <p className="text-sm text-slate-600">{profile.roleProfile.seniority || profile.roleProfile.experienceLevel}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Difficulty</p>
                  <p className="mt-1 text-2xl font-bold">{profile.blueprint.difficultyScore.toFixed(1)} / 10</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Readiness</p>
                  <p className="mt-1 text-2xl font-bold">{profile.readiness.overallScore}%</p>
                  <p className="text-xs text-slate-500">{profile.readiness.status.replace("_", " ")}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {profile.readiness.components.map((component) => (
                  <div key={component.key} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{component.label}</p>
                      <ScorePill score={component.score} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{component.explanation}</p>
                  </div>
                ))}
              </div>

              {profile.salaryRange ? (
                <div className="mt-5 rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="font-semibold">Salary Range</p>
                  <p className="mt-1 text-slate-600">
                    {[profile.salaryRange.min, profile.salaryRange.median, profile.salaryRange.max].filter((value) => value !== null).join(" / ")} {profile.salaryRange.currency}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState title="Salary range unavailable" body="No stored salary insight matched this company and role, so CareerOS is not displaying compensation estimates." />
                </div>
              )}
            </Section>

            <div className="space-y-5">
              <Section title="Interview Blueprint" icon={ClipboardList}>
                <div className="space-y-3">
                  {profile.blueprint.rounds.map((round) => (
                    <div key={`${round.roundNumber}-${round.type}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">
                          Round {round.roundNumber}: {round.name}
                        </p>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{round.durationMinutes} min</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {round.focusAreas.map((area) => (
                          <span key={area} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">{area}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Roadmap" icon={BarChart3}>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["7 Day Plan", profile.roadmap.sevenDayPlan],
                    ["14 Day Plan", profile.roadmap.fourteenDayPlan],
                    ["30 Day Plan", profile.roadmap.thirtyDayPlan],
                    ["90 Day Plan", profile.roadmap.ninetyDayPlan],
                  ].map(([title, items]) => (
                    <div key={title as string} className="rounded-lg bg-slate-50 p-4">
                      <p className="font-semibold">{title as string}</p>
                      <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-600">
                        {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>

              <button type="button" onClick={() => void startMock()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                <MessageSquare className="h-4 w-4" />
                Start Round 1 Mock
              </button>
            </div>
          </div>
        )}

        {activeTab === "mock" && profile && (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <Section title="Adaptive Mock Engine" icon={MessageSquare}>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-md bg-slate-100 px-2 py-1">{profile.companyProfile.name}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">{profile.roleProfile.title}</span>
                {persona && <span className="rounded-md bg-slate-100 px-2 py-1">{persona}</span>}
                {currentFocus && <span className="rounded-md bg-slate-100 px-2 py-1">Focus: {currentFocus}</span>}
              </div>
              <div className="min-h-[440px] rounded-lg border border-slate-200 bg-slate-50 p-4">
                {mockStatus === "idle" ? (
                  <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                    <MessageSquare className="h-8 w-8 text-slate-500" />
                    <p className="mt-3 font-semibold">No mock round running</p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">Start Round 1 from the stored blueprint. Follow-ups are generated from your previous answer and evaluation gaps.</p>
                    <button type="button" onClick={() => void startMock()} className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                      {busyAction === "mock-start" ? "Starting" : "Start Round 1"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mockTranscript.map((turn, index) => (
                      <div key={`${turn.timestamp ?? index}-${index}`} className={`flex ${turn.speaker === "candidate" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-lg p-3 text-sm leading-6 ${turn.speaker === "candidate" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                          <p className="text-xs font-semibold uppercase opacity-70">{turn.speaker === "candidate" ? "You" : "Interviewer"}</p>
                          <p className="mt-1 whitespace-pre-wrap">{turn.text}</p>
                        </div>
                      </div>
                    ))}
                    {mockStatus === "evaluating" && (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Evaluation is being calculated from stored answers.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {mockStatus === "active" && (
                <div className="mt-4 flex gap-3">
                  <textarea
                    value={candidateAnswer}
                    onChange={(event) => setCandidateAnswer(event.target.value)}
                    placeholder={currentQuestion ? "Answer the current question" : "Type your answer"}
                    className="min-h-20 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700"
                  />
                  <div className="flex w-32 flex-col gap-2">
                    <button type="button" onClick={() => void submitAnswer()} disabled={!candidateAnswer.trim() || busyAction !== null} className="flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400">
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                    <button type="button" onClick={() => void finishMock()} disabled={busyAction !== null} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">
                      End
                    </button>
                  </div>
                </div>
              )}
            </Section>

            <div className="space-y-5">
              <Section title="Latest Answer" icon={CheckCircle2}>
                {latestAnswerEvaluation ? (
                  <div className="space-y-3 text-sm">
                    {[
                      ["Overall", latestAnswerEvaluation.overall],
                      ["Communication", latestAnswerEvaluation.communication],
                      ["Technical Depth", latestAnswerEvaluation.technicalDepth],
                      ["Tradeoffs", latestAnswerEvaluation.tradeoffs],
                      ["Completeness", latestAnswerEvaluation.completeness],
                    ].map(([label, score]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <span className="text-slate-600">{label as string}</span>
                        <ScorePill score={score as number} />
                      </div>
                    ))}
                    {latestAnswerEvaluation.improvements.length > 0 && (
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="font-semibold">Next pressure point</p>
                        <p className="mt-1 text-slate-600">{latestAnswerEvaluation.improvements[0]}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState title="No answer evaluated yet" body="Answer the first interviewer prompt to see per-answer communication, depth, tradeoff, confidence, and completeness scores." />
                )}
              </Section>

              <Section title="Session Evaluation" icon={Award}>
                {mockEvaluation ? (
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg bg-slate-950 p-4 text-white">
                      <p className="text-xs uppercase opacity-70">Mock Score</p>
                      <p className="mt-1 text-3xl font-bold">{mockEvaluation.score}%</p>
                    </div>
                    <p className="leading-6 text-slate-700">{mockEvaluation.summary}</p>
                    {mockEvaluation.nextDrill && <p className="rounded-lg bg-slate-50 p-3 text-slate-700">{mockEvaluation.nextDrill}</p>}
                  </div>
                ) : (
                  <EmptyState title="Session not evaluated" body="Complete or end a mock round to store the evaluation and recalibrate readiness." />
                )}
              </Section>
            </div>
          </div>
        )}

        {activeTab === "analytics" && profile && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Section title="Readiness Trend" icon={BarChart3}>
              {profile.analytics.readinessTrend.length ? (
                <div className="space-y-2">
                  {profile.analytics.readinessTrend.map((point) => (
                    <div key={point.date} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                      <span>{new Date(point.date).toLocaleDateString()}</span>
                      <ScorePill score={point.score} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No readiness trend yet" body="Generate repeated readiness snapshots or complete mocks to build a trend." />
              )}
            </Section>
            <Section title="Mock Trend" icon={MessageSquare}>
              {profile.analytics.mockTrend.length ? (
                <div className="space-y-2">
                  {profile.analytics.mockTrend.map((point) => (
                    <div key={point.date} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                      <span>{new Date(point.date).toLocaleDateString()}</span>
                      <ScorePill score={point.score} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No mock trend yet" body="Stored mock evaluations will appear here after completed sessions." />
              )}
            </Section>
            <Section title="Pass Probability" icon={Award}>
              <EmptyState title="Pass probability unavailable" body="CareerOS needs enough company, role, and evaluation history before it can show this metric without fabricating it." />
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}
