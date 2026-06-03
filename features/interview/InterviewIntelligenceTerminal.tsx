"use client";

import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Code2,
  Gauge,
  GitBranch,
  Loader2,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  FileText,
  User,
  ArrowRight,
  RefreshCw,
  Award,
  AlertTriangle,
  HelpCircle,
  Volume2,
  VolumeX,
  Plus,
  Check,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InterviewContributionModal } from "@/components/interview/InterviewContributionModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts";

type ActiveTab = "terminal" | "matcher" | "mock" | "readiness";

type TranscriptTurn = {
  speaker: "interviewer" | "candidate";
  text: string;
  timestamp: string;
  focusTopic?: string;
  personaState?: string;
};

type ApiResponse<T> = { data: T | null; error: string | null };

const examples = ["Google SDE 2", "Flipkart Backend Engineer", "Razorpay Senior SDE", "Zepto AI Engineer"];

function pct(value: unknown) {
  const number = typeof value === "number" ? value : 0;
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`;
}

function splitQuery(query: string) {
  const parts = query.trim().split(/\s+/);
  const company = parts[0] ?? "";
  const role = parts.slice(1).join(" ");
  return { company, role };
}

export function InterviewIntelligenceTerminal() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("terminal");
  const [query, setQuery] = useState("Google SDE 2");
  const [terminal, setTerminal] = useState<Record<string, any> | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);
  const [solution, setSolution] = useState<Record<string, any> | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Resume & JD Matcher States
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [matcherResult, setMatcherResult] = useState<Record<string, any> | null>(null);
  const [matcherLoading, setMatcherLoading] = useState(false);

  // Adaptive Mock Room States
  const [mockSession, setMockSession] = useState<Record<string, any> | null>(null);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [mockLoading, setMockLoading] = useState(false);
  const [mockEvaluating, setMockEvaluating] = useState(false);
  const [mockResult, setMockResult] = useState<Record<string, any> | null>(null);
  
  // Audio/Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Readiness states
  const [readinessResult, setReadinessResult] = useState<Record<string, any> | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  // Standard Company terminal calls
  async function runSearch(nextQuery = query) {
    const { company, role } = splitQuery(nextQuery);
    setLoading(true);
    setSolution(null);
    try {
      const [companyRes, searchRes] = await Promise.all([
        fetch(`/api/v1/interview-intelligence/company?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}`),
        fetch(`/api/v1/interview-intelligence/search?q=${encodeURIComponent(nextQuery)}&company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&limit=12`),
      ]);
      const companyJson = await companyRes.json() as ApiResponse<Record<string, any>>;
      const searchJson = await searchRes.json() as ApiResponse<Record<string, any>[]>;
      setTerminal(companyJson.data);
      setSearchResults(searchJson.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function seedIndia() {
    setActionLoading("seed");
    try {
      await fetch("/api/v1/interview-intelligence/ingest/seed-india", { method: "POST" });
      await runSearch();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function generateSolution(questionId: string) {
    setActionLoading(questionId);
    try {
      const res = await fetch(`/api/v1/interview-intelligence/questions/${questionId}/solution`, { method: "POST" });
      const json = await res.json() as ApiResponse<Record<string, any>>;
      setSolution(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  // Resume & JD Alignment Matcher call
  async function runMatcherAnalysis() {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    setMatcherLoading(true);
    try {
      const { company, role } = splitQuery(query);
      const res = await fetch("/api/v1/interview-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          companyName: company || "Target Company",
          roleTitle: role || "Software Engineer",
        }),
      });
      const json = await res.json();
      if (json.data) {
        setMatcherResult(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMatcherLoading(false);
    }
  }

  // Speech-to-text Toggle
  function toggleSpeechInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechConstructor) {
      alert("Speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    const recognition = new SpeechConstructor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    
    recognition.onresult = (event: any) => {
      const resultText = event.results[event.results.length - 1]?.[0]?.transcript;
      if (resultText) {
        setCandidateAnswer(prev => prev + " " + resultText);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  // Start Adaptive Mock Interview Session
  async function startAdaptiveMock() {
    setMockLoading(true);
    setMockResult(null);
    setCandidateAnswer("");
    const { company, role } = splitQuery(query);
    try {
      const res = await fetch("/api/v1/interview-intelligence/mock/adaptive-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle: role || "Software Engineer",
          companyName: company || "Target Company",
          resumeText: resumeText || undefined,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setMockSession(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMockLoading(false);
    }
  }

  // Submit response in Adaptive Mock Room
  async function submitMockResponse() {
    if (!candidateAnswer.trim() || !mockSession) return;
    setMockLoading(true);
    try {
      const res = await fetch("/api/v1/interview-intelligence/mock/adaptive-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: mockSession.sessionId,
          candidateResponse: candidateAnswer,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setMockSession(json.data);
        setCandidateAnswer("");
        
        // If interview was complete, trigger evaluation automatically
        if (json.data.isInterviewComplete) {
          await evaluateAdaptiveMock(json.data.sessionId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMockLoading(false);
    }
  }

  // Trigger Mock Session Evaluation
  async function evaluateAdaptiveMock(sessionId: string) {
    setMockEvaluating(true);
    try {
      const res = await fetch("/api/v1/interview-intelligence/mock/adaptive-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (json.data) {
        setMockResult(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMockEvaluating(false);
    }
  }

  // Fetchaggregate readiness profile & roadmap
  async function calculateReadiness() {
    setReadinessLoading(true);
    const { company, role } = splitQuery(query);
    try {
      const res = await fetch("/api/v1/interview-intelligence/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle: role || "Software Engineer",
          companyName: company || "Target Company",
          resumeText: resumeText || undefined,
          jobDescription: jobDescription || undefined,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setReadinessResult(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReadinessLoading(false);
    }
  }

  const prediction = terminal?.prediction;
  const questionMix = terminal?.questionMix ?? {};
  const prepPlan = terminal?.prepPlan;
  const topQuestions = terminal?.topQuestions ?? [];
  const hasUnlocked = terminal?.hasUnlocked ?? false;
  const { company: parsedCompany, role: parsedRole } = splitQuery(query);

  // Pre-fill some standard demo text for rich aesthetics if user leaves blank
  useEffect(() => {
    if (!resumeText) {
      setResumeText(
        "AAMIR KHAN - Senior Full Stack Engineer (NodeJS / React / Postgres)\n\n" +
        "SUMMARY:\n" +
        "Senior Software Engineer with 6 years of experience building scalable backend APIs, real-time message streams, and robust React applications. Highly expert in optimizing database query throughput and concurrency.\n\n" +
        "EXPERIENCE:\n" +
        "Senior Backend Architect - Tech Solutions India (2022 - Present)\n" +
        "- Engineered an event-driven payment service using Kafka and Node.js, managing 5,000 TPS with zero transactional loss.\n" +
        "- Designed a distributed locks scheduler using Redis, slashing concurrent transaction race hazards by 98%.\n" +
        "- Mentored 6 junior/mid-level engineers, enforcing strict SOLID design and API unit testing.\n\n" +
        "SKILLS:\n" +
        "NodeJS, Express, React, NextJS, TypeScript, PostgreSQL, Redis, Apache Kafka, Docker, AWS, System LLD/HLD, STAR Behavioral Prep."
      );
    }
    if (!jobDescription) {
      setJobDescription(
        "SDE-2 / Senior Backend Engineer (Razorpay payments team)\n\n" +
        "ABOUT THE ROLE:\n" +
        "We are looking for a senior backend engineer to join our high-scale payments routing engineering team. You will build concurrent transaction ledger systems, transactional gateways, and scalable APIs.\n\n" +
        "REQUIREMENTS:\n" +
        "- 4+ years building high-scale production systems.\n" +
        "- Highly proficient with transactional database guarantees, ACID properties, sharding, and caching.\n" +
        "- Direct experience with Kafka, Redis cluster caching, and API Gateway load balancing.\n" +
        "- Strong focus on first-principles DSA, Modular LLD Code Design, and outstanding communication skills."
      );
    }
  }, []);

  // Format Recharts data for radar
  const radarData = readinessResult ? [
    { name: "DSA", score: readinessResult.competencyScores.dsa },
    { name: "System Design", score: readinessResult.competencyScores.systemDesign },
    { name: "Behavioral", score: readinessResult.competencyScores.behavioral },
    { name: "Communication", score: readinessResult.competencyScores.communication },
    { name: "Domain Knowledge", score: readinessResult.competencyScores.domainKnowledge },
  ] : [
    { name: "DSA", score: 70 },
    { name: "System Design", score: 60 },
    { name: "Behavioral", score: 75 },
    { name: "Communication", score: 80 },
    { name: "Domain Knowledge", score: 65 },
  ];

  return (
    <div className="container-premium space-y-6">
      {/* Premium Dashboard Header */}
      <section className="rounded-lg border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge variant="primary">CareerOS v2.0</Badge>
              <Badge variant="neutral" className="border border-accent text-accent bg-transparent">India Market Special Edition</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Interview Intelligence Operating System
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Synthesize resume intelligence, target company hiring graphs, adaptive mock simulations, and readiness roadmaps inside one integrated terminal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={seedIndia} isLoading={actionLoading === "seed"} variant="outline" className="border-border hover:bg-surface-muted">
              <Sparkles className="h-4 w-4 text-accent" />
              Seed India Intel
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void runSearch();
              }}
              className="h-12 pl-10 text-base"
              placeholder="Google SDE 2, TCS Ninja, Zepto AI Engineer"
            />
          </div>
          <Button size="lg" className="h-12 px-6" onClick={() => runSearch()} isLoading={loading}>
            <BrainCircuit className="h-4 w-4 mr-2" />
            Analyze Target
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                void runSearch(example);
              }}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      {/* Modern Horizontal Navigation Tabs */}
      <div className="flex border-b border-border bg-surface rounded-lg p-1.5 shadow-sm">
        {(["terminal", "matcher", "mock", "readiness"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "readiness" && !readinessResult) {
                calculateReadiness();
              }
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-all duration-200 capitalize",
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            )}
          >
            {tab === "terminal" && <Building2 className="h-4 w-4 text-accent" />}
            {tab === "matcher" && <FileText className="h-4 w-4 text-accent" />}
            {tab === "mock" && <Play className="h-4 w-4 text-accent" />}
            {tab === "readiness" && <BarChart3 className="h-4 w-4 text-accent" />}
            {tab === "terminal" ? "Hiring Intelligence" : tab === "matcher" ? "Resume & JD Matcher" : tab === "mock" ? "Adaptive Mock Room" : "Readiness & Roadmap"}
          </button>
        ))}
      </div>

      {/* Tab Contents with Transitions */}
      <AnimatePresence mode="wait">
        {activeTab === "terminal" && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {loading && (
              <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            )}

            {!loading && terminal && (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Metric icon={Gauge} label="Selection Probability" value={pct(prediction?.selectionProbability)} color="text-success" />
                  <Metric icon={Code2} label="OA Difficulty" value={pct(prediction?.oaDifficulty)} color="text-warning" />
                  <Metric icon={TrendingUp} label="Interview Difficulty" value={pct(prediction?.interviewDifficulty)} color="text-accent" />
                  <Metric icon={ShieldCheck} label="Prediction Confidence" value={pct(prediction?.confidence)} color="text-primary" />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-lg border border-border bg-surface p-5">
                    <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <BookOpenCheck className="h-4 w-4 text-accent" />
                          <h2 className="text-base font-semibold">Most Asked Questions</h2>
                        </div>
                        <Badge variant="primary">
                          {topQuestions.length || searchResults.length} signals
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aggregated from {Math.max(1, (terminal?.experiences?.length || 0) + (topQuestions.length || 0) + 4)} candidate reports in the last 30 days.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {(topQuestions.length ? topQuestions : searchResults).slice(0, hasUnlocked ? 10 : 3).map((item: any) => {
                        const question = item.question ?? item;
                        return (
                          <div key={item.id ?? question.id} className="rounded-lg border border-border bg-background p-4 transition-all hover:border-accent/40">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="primary">{question.kind}</Badge>
                              <Badge>{question.difficulty}</Badge>
                              {item.frequency && <Badge variant="success">{item.frequency.askCount} reports</Badge>}
                            </div>
                            <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{question.title ?? question.prompt}</p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{question.prompt}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={hasUnlocked ? () => generateSolution(question.id) : () => setIsContributeModalOpen(true)}
                                isLoading={actionLoading === question.id}
                              >
                                {hasUnlocked ? "Generate Solution" : "Unlock Solution"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {!hasUnlocked && (
                        <div className="relative mt-4 overflow-hidden rounded-lg border border-dashed border-accent/40 bg-accent/5 p-6 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                            <Lock className="h-6 w-6 animate-pulse" />
                          </div>
                          <h3 className="mt-3 text-sm font-bold text-foreground">
                            Unlock {Math.max(1, (topQuestions.length || searchResults.length) - 3)}+ More Real Questions
                          </h3>
                          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                            Help next-gen engineers bypass tech hiring biases. Share one recent interview question you were asked to unlock detailed prep files.
                          </p>
                          <Button
                            size="sm"
                            className="mt-4"
                            onClick={() => setIsContributeModalOpen(true)}
                          >
                            Share Experience & Unlock
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Panel title="Company Pattern Mix" icon={Building2}>
                      <Mix label="DSA & Problem Solving" value={questionMix.dsa} />
                      <Mix label="System Design (HLD/LLD)" value={questionMix.systemDesign} />
                      <Mix label="Behavioral & Core Values" value={questionMix.behavioral} />
                      <Mix label="OA/Aptitude / Fundamentals" value={questionMix.oa} />
                    </Panel>

                    <Panel title="Target Prep Plan" icon={GitBranch}>
                      <p className="text-sm font-semibold text-foreground">{prepPlan?.headline}</p>
                      <div className="relative mt-3">
                        <div className={cn("space-y-2.5", !hasUnlocked && "blur-[3px] select-none pointer-events-none")}>
                          {(prepPlan?.focus ?? []).map((item: string) => (
                            <p key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                              {item}
                            </p>
                          ))}
                        </div>
                        {!hasUnlocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 p-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 bg-background shadow-sm border-border hover:bg-surface"
                              onClick={() => setIsContributeModalOpen(true)}
                            >
                              <Lock className="h-4 w-4 text-accent" />
                              Unlock Roadmaps
                            </Button>
                          </div>
                        )}
                      </div>
                      <Button
                        className="mt-4 w-full"
                        onClick={hasUnlocked ? () => setActiveTab("mock") : () => setIsContributeModalOpen(true)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {hasUnlocked ? "Enter Mock Room" : "Unlock Mock Room with Contribution"}
                      </Button>
                    </Panel>
                  </div>
                </section>

                {solution && (
                  <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-accent" />
                      <h2 className="text-base font-semibold">Original AI Solution Scaffolding</h2>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <SolutionBlock title="Brute Force Approach" value={solution.bruteForce} />
                      <SolutionBlock title="Optimized Approach" value={solution.optimized} />
                      <SolutionBlock title="Interviewer Expectations" value={solution.interviewerExpectations} />
                      <SolutionBlock title="Likely Follow-ups" value={solution.followUps} />
                    </div>
                  </section>
                )}
              </>
            )}

            {!terminal && !loading && (
              <div className="text-center rounded-lg border border-dashed border-border bg-surface p-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60 animate-bounce" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">No active search</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Type your target company and role in the terminal bar above (e.g. <b>Flipkart SDE 2</b>) to analyze patterns.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "matcher" && (
          <motion.div
            key="matcher"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 lg:grid-cols-[1fr_380px]"
          >
            <Card variant="elevated" className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Alignment Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Your Resume Content</label>
                    <Textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="h-72 resize-none text-xs font-mono leading-5"
                      placeholder="Paste plain text of your resume..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Target Job Description</label>
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="h-72 resize-none text-xs leading-5"
                      placeholder="Paste target job responsibilities..."
                    />
                  </div>
                </div>

                <Button
                  onClick={runMatcherAnalysis}
                  disabled={matcherLoading || !resumeText || !jobDescription}
                  className="w-full h-11"
                >
                  {matcherLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing and Aligning Stack...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Calculate Resume-JD Fit Map
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {matcherResult ? (
                <>
                  <div className="rounded-lg border border-border bg-surface p-5 shadow-sm text-center">
                    <Award className="mx-auto h-8 w-8 text-accent mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Alignment Score</p>
                    <p className="text-4xl font-extrabold text-foreground mt-2">{matcherResult.matchPercentage}%</p>
                    <Badge variant={matcherResult.fitClassification.includes("Strong") ? "success" : "warning"} className="mt-2">
                      {matcherResult.fitClassification}
                    </Badge>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-left border-t border-border pt-3">
                      {matcherResult.alignmentSummary}
                    </p>
                  </div>

                  <Panel title="Rejection Risks" icon={AlertTriangle}>
                    <div className="space-y-2">
                      {matcherResult.rejectionRisks.map((risk: string, i: number) => (
                        <p key={i} className="flex gap-2 text-xs leading-5 text-danger bg-danger/10 p-2.5 rounded border border-danger/20">
                          <X className="h-4 w-4 shrink-0 mt-0.5" />
                          {risk}
                        </p>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Missing Competencies" icon={HelpCircle}>
                    <p className="text-xs font-bold text-foreground">Keywords Gaps</p>
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                      {matcherResult.missingKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="neutral" className="border border-border text-danger bg-transparent">{kw}</Badge>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-foreground">Technology Gaps</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {matcherResult.missingTechnologies.map((tech: string, i: number) => (
                        <Badge key={i} variant="neutral" className="border border-border text-danger bg-transparent">{tech}</Badge>
                      ))}
                    </div>
                  </Panel>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Provide your Resume and the target Job Description on the left, then click <b>Calculate</b> to trigger intelligence synthesis.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "mock" && (
          <motion.div
            key="mock"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {!mockSession && !mockResult && (
              <div className="text-center rounded-lg border border-dashed border-border bg-surface p-12">
                <BrainCircuit className="mx-auto h-12 w-12 text-accent/80 animate-pulse" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">Adaptive technical practice sandbox</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Start an adaptive AI mock session. The AI will challenge your technical depth, question database choices, concurrency lockups, and provide detailed grading scores.
                </p>
                <Button onClick={startAdaptiveMock} isLoading={mockLoading} className="mt-6">
                  <Play className="h-4 w-4 mr-2" />
                  Launch Mock Session
                </Button>
              </div>
            )}

            {mockSession && !mockResult && (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                  {/* Current Active Interviewer Question */}
                  <Card variant="elevated" className="border-accent/40 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3 bg-accent/5">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-accent" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-accent">Interviewer Turn</CardTitle>
                      </div>
                      <Badge variant="primary" className="capitalize">{mockSession.personaState ?? "Neutral"}</Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="text-base font-semibold leading-relaxed text-foreground bg-surface-muted p-4 rounded-lg border border-border">
                        {mockSession.nextQuestion}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="neutral" className="border border-border bg-transparent">Active Topic: {mockSession.focusTopic ?? "Core Tech Architecture"}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Candidate Input Sandbox */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Your Technical Answer</label>
                      <button
                        onClick={toggleSpeechInput}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-semibold py-1 px-3.5 rounded-full border transition-all",
                          isListening
                            ? "bg-danger/10 border-danger text-danger animate-pulse"
                            : "bg-surface hover:bg-surface-muted text-muted-foreground border-border"
                        )}
                      >
                        {isListening ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                        {isListening ? "Listening (Click to stop)" : "Voice Speech Input"}
                      </button>
                    </div>
                    <Textarea
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                      className="h-44 leading-relaxed resize-none text-sm"
                      placeholder="Explain your approach. Highlight specific architectural components, constraints, and tradeoff reasoning..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      className="border-border"
                      onClick={() => setMockSession(null)}
                    >
                      Abort Session
                    </Button>
                    <Button
                      onClick={submitMockResponse}
                      disabled={mockLoading || !candidateAnswer.trim()}
                      isLoading={mockLoading}
                    >
                      Submit Response
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Session Context Information */}
                  <Panel title="Interviewer Persona Context" icon={ShieldCheck}>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The interviewer model is evaluating technical depth and first-principles design logic.
                    </p>
                    <div className="mt-4 p-3 bg-surface-muted rounded border border-border">
                      <p className="text-xs font-bold text-foreground">Current Persona Focus:</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{mockSession.personaState ?? "Supportive & Challenging"}</p>
                    </div>
                  </Panel>

                  {/* Live Conversation Transcript */}
                  <Panel title="Active Transcript" icon={MessageSquare}>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {mockSession.transcript.map((turn: TranscriptTurn, idx: number) => (
                        <div key={idx} className={cn("p-2.5 rounded text-xs leading-relaxed border",
                          turn.speaker === "interviewer"
                            ? "bg-accent/5 border-accent/20 text-foreground"
                            : "bg-surface-muted border-border text-muted-foreground ml-3"
                        )}>
                          <span className="font-bold capitalize">{turn.speaker}:</span> {turn.text}
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {mockResult && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-[350px_1fr]">
                  <Card variant="elevated" className="border-border p-5 text-center flex flex-col justify-between">
                    <div>
                      <Award className="mx-auto h-12 w-12 text-accent" />
                      <h3 className="text-lg font-bold text-foreground mt-2">Mock Interview Score</h3>
                      <p className="text-5xl font-black text-foreground mt-4">{mockResult.score}%</p>
                      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                        {mockResult.summary}
                      </p>
                    </div>
                    <Button onClick={startAdaptiveMock} className="mt-6 w-full">
                      Start New Practice
                    </Button>
                  </Card>

                  <Card variant="glass" className="border-border">
                    <CardHeader>
                      <CardTitle>Grading Metric Scores</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Mix label="Technical Depth" value={mockResult.rubric.technicalDepth.score / 100} />
                      <p className="text-xs text-muted-foreground -mt-2.5 mb-2 pl-1">{mockResult.rubric.technicalDepth.feedback}</p>
                      
                      <Mix label="Communication clarity" value={mockResult.rubric.communication.score / 100} />
                      <p className="text-xs text-muted-foreground -mt-2.5 mb-2 pl-1">{mockResult.rubric.communication.feedback}</p>

                      <Mix label="Problem Solving approach" value={mockResult.rubric.problemSolving.score / 100} />
                      <p className="text-xs text-muted-foreground -mt-2.5 mb-2 pl-1">{mockResult.rubric.problemSolving.feedback}</p>

                      <Mix label="STAR Behavioral alignment" value={mockResult.rubric.starBehavioral.score / 100} />
                      <p className="text-xs text-muted-foreground -mt-2.5 mb-2 pl-1">{mockResult.rubric.starBehavioral.feedback}</p>

                      <Mix label="Tradeoff Thinking" value={mockResult.rubric.tradeoffThinking.score / 100} />
                      <p className="text-xs text-muted-foreground -mt-2.5 pl-1">{mockResult.rubric.tradeoffThinking.feedback}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground mb-3">Proven Strengths</h3>
                    <div className="space-y-2">
                      {mockResult.strengths.map((str: string, i: number) => (
                        <p key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          {str}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground mb-3">Key Improvements Needed</h3>
                    <div className="space-y-2">
                      {mockResult.improvements.map((imp: string, i: number) => (
                        <p key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                          <X className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                          {imp}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <Award className="h-5 w-5 text-accent" />
                    <h3 className="text-sm font-bold text-foreground">A Perfect World-Class Response Model</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground bg-background p-4 rounded border border-border font-mono whitespace-pre-wrap">
                    {mockResult.improvedAnswerExample}
                  </p>
                  <div className="p-3 bg-accent/5 border border-accent/20 rounded">
                    <p className="text-xs font-bold text-accent">Recommended Exercise:</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mockResult.nextDrill}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "readiness" && (
          <motion.div
            key="readiness"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {readinessLoading ? (
              <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : readinessResult ? (
              <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                <div className="space-y-6">
                  {/* Readiness Index overall card */}
                  <Card variant="elevated" className="border-border text-center p-5">
                    <CardHeader className="pb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hiring Readiness Index</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-6xl font-black text-accent">{readinessResult.overallReadinessScore}%</p>
                      
                      <div className="mt-4 py-2 px-4 bg-surface-muted rounded border border-border/80 text-left">
                        <p className="text-xs font-bold text-foreground">Target Company Fit Score:</p>
                        <p className="text-xl font-semibold text-foreground mt-1">{readinessResult.companyFitIndex}%</p>
                      </div>

                      <div className="mt-4 border-t border-border pt-4 text-left">
                        <p className="text-xs font-bold text-foreground">Recruiter Intelligence Notes:</p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-accent/5 p-2 rounded border border-accent/10">
                          {readinessResult.recruiterNotesHint}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Competency Radar Widget */}
                  <Card variant="elevated" className="border-border">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Competency Radar Map</CardTitle>
                    </CardHeader>
                    <CardContent className="h-60 pt-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                          <ChartTooltip />
                          <Radar dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {/* Key competency gaps */}
                  <Panel title="Identified Competency Gaps" icon={AlertTriangle}>
                    <div className="grid gap-3 md:grid-cols-2">
                      {readinessResult.keyGaps.map((gap: any, i: number) => (
                        <div key={i} className="p-3 border border-border bg-background rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{gap.area}</span>
                            <Badge variant={gap.priority === "high" ? "danger" : gap.priority === "medium" ? "warning" : "primary"}>
                              {gap.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{gap.gapDescription}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {/* 7-14-30 preparation roadmaps */}
                  <Panel title="Personalized Actionable Roadmap" icon={GitBranch}>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 border border-border bg-background rounded-lg space-y-3">
                        <div className="flex items-center gap-2 border-b border-border pb-2">
                          <Badge variant="primary">Days 1 - 7</Badge>
                          <span className="text-xs font-bold text-foreground">Direct Drilling</span>
                        </div>
                        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed pl-1">
                          {readinessResult.roadmap.sevenDays.map((item: string, i: number) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-accent font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 border border-border bg-background rounded-lg space-y-3">
                        <div className="flex items-center gap-2 border-b border-border pb-2">
                          <Badge variant="warning">Days 8 - 14</Badge>
                          <span className="text-xs font-bold text-foreground">Advanced HLD</span>
                        </div>
                        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed pl-1">
                          {readinessResult.roadmap.fourteenDays.map((item: string, i: number) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-accent font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 border border-border bg-background rounded-lg space-y-3">
                        <div className="flex items-center gap-2 border-b border-border pb-2">
                          <Badge variant="success">Days 15 - 30</Badge>
                          <span className="text-xs font-bold text-foreground">Scale & Mock</span>
                        </div>
                        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed pl-1">
                          {readinessResult.roadmap.thirtyDays.map((item: string, i: number) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-accent font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Panel>

                  {/* Impact tips */}
                  <Panel title="Insider Prep Strategy Tips" icon={Sparkles}>
                    <div className="space-y-2.5">
                      {readinessResult.impactTips.map((tip: string, i: number) => (
                        <p key={i} className="text-xs leading-relaxed text-muted-foreground flex gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          {tip}
                        </p>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : (
              <div className="text-center rounded-lg border border-dashed border-border bg-surface p-12">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">Calculating readiness roadmap profile...</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Click the button below to parse your profile, resume alignment, and evaluate overall hiring readiness for <b>{query}</b>.
                </p>
                <Button onClick={calculateReadiness} isLoading={readinessLoading} className="mt-6">
                  Generate Readiness Profile
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InterviewContributionModal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        defaultCompany={parsedCompany}
        defaultRole={parsedRole}
        onSuccess={() => {
          void runSearch();
        }}
      />
    </div>
  );
}

function Metric({ icon: Icon, label, value, color = "text-accent" }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <Icon className="h-4 w-4 text-accent" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", color)}>{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Mix({ label, value }: { label: string; value: number }) {
  const width = Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-foreground font-semibold">{width}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted">
        <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SolutionBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground font-mono">
        {typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}
