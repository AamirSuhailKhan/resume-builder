"use client";

import { useState } from "react";
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
  MessageSquarePlus,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type JsonRecord = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */
type ApiResponse<T> = { data: T | null; error: string | null };

const examples = ["Google SDE 2", "Flipkart Backend Engineer", "TCS Ninja", "Zepto AI Engineer"];

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
  const [query, setQuery] = useState("Google SDE 2");
  const [terminal, setTerminal] = useState<JsonRecord | null>(null);
  const [searchResults, setSearchResults] = useState<JsonRecord[]>([]);
  const [solution, setSolution] = useState<JsonRecord | null>(null);
  const [contribution, setContribution] = useState("");
  const [mockSession, setMockSession] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function runSearch(nextQuery = query) {
    const { company, role } = splitQuery(nextQuery);
    setLoading(true);
    setSolution(null);
    try {
      const [companyRes, searchRes] = await Promise.all([
        fetch(`/api/v1/interview-intelligence/company?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}`),
        fetch(`/api/v1/interview-intelligence/search?q=${encodeURIComponent(nextQuery)}&company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&limit=12`),
      ]);
      const companyJson = await companyRes.json() as ApiResponse<JsonRecord>;
      const searchJson = await searchRes.json() as ApiResponse<JsonRecord[]>;
      setTerminal(companyJson.data);
      setSearchResults(searchJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function seedIndia() {
    setActionLoading("seed");
    try {
      await fetch("/api/v1/interview-intelligence/ingest/seed-india", { method: "POST" });
      await runSearch();
    } finally {
      setActionLoading(null);
    }
  }

  async function generateSolution(questionId: string) {
    setActionLoading(questionId);
    try {
      const res = await fetch(`/api/v1/interview-intelligence/questions/${questionId}/solution`, { method: "POST" });
      const json = await res.json() as ApiResponse<JsonRecord>;
      setSolution(json.data);
    } finally {
      setActionLoading(null);
    }
  }

  async function submitContribution() {
    const { company, role } = splitQuery(query);
    if (!contribution.trim()) return;
    setActionLoading("contribute");
    try {
      await fetch("/api/v1/interview-intelligence/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "question",
          companyName: company,
          roleTitle: role,
          payload: { question: contribution },
        }),
      });
      setContribution("");
      await runSearch();
    } finally {
      setActionLoading(null);
    }
  }

  async function startMock() {
    const { company, role } = splitQuery(query);
    setActionLoading("mock");
    try {
      const res = await fetch("/api/v1/interview-intelligence/mock/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company, roleTitle: role || "Software Engineer", mode: "mixed" }),
      });
      const json = await res.json() as ApiResponse<JsonRecord>;
      setMockSession(json.data);
    } finally {
      setActionLoading(null);
    }
  }

  const prediction = terminal?.prediction;
  const questionMix = terminal?.questionMix ?? {};
  const prepPlan = terminal?.prepPlan;
  const topQuestions = terminal?.topQuestions ?? [];

  return (
    <div className="container-premium space-y-6">
      <section className="rounded-lg border border-border bg-surface-elevated p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="primary">Interview Intelligence OS</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
              Search any company, role, or interview.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Company patterns, repeated questions, OA signals, recruiter behavior, compensation context, and a personalized prep plan in one terminal.
            </p>
          </div>
          <Button onClick={seedIndia} isLoading={actionLoading === "seed"} variant="outline">
            <Sparkles className="h-4 w-4" />
            Seed India Intel
          </Button>
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
          <Button size="lg" onClick={() => runSearch()} isLoading={loading}>
            <BrainCircuit className="h-4 w-4" />
            Analyze
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

      {loading && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {!loading && terminal && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Gauge} label="Selection Probability" value={pct(prediction?.selectionProbability)} />
            <Metric icon={Code2} label="OA Difficulty" value={pct(prediction?.oaDifficulty)} />
            <Metric icon={TrendingUp} label="Interview Difficulty" value={pct(prediction?.interviewDifficulty)} />
            <Metric icon={ShieldCheck} label="Prediction Confidence" value={pct(prediction?.confidence)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-semibold">Most Asked Questions</h2>
                </div>
                <Badge>{topQuestions.length || searchResults.length} signals</Badge>
              </div>
              <div className="space-y-3">
                {(topQuestions.length ? topQuestions : searchResults).slice(0, 10).map((item: JsonRecord) => {
                  const question = item.question ?? item;
                  return (
                    <div key={item.id ?? question.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{question.kind}</Badge>
                        <Badge>{question.difficulty}</Badge>
                        {item.frequency && <Badge variant="success">{item.frequency.askCount} reports</Badge>}
                      </div>
                      <p className="mt-3 text-sm font-medium leading-6 text-foreground">{question.title ?? question.prompt}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{question.prompt}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => generateSolution(question.id)} isLoading={actionLoading === question.id}>
                          Generate Solution
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <Panel title="Company Pattern" icon={Building2}>
                <Mix label="DSA" value={questionMix.dsa} />
                <Mix label="System Design" value={questionMix.systemDesign} />
                <Mix label="Behavioral" value={questionMix.behavioral} />
                <Mix label="OA/Aptitude" value={questionMix.oa} />
              </Panel>

              <Panel title="AI Prep Plan" icon={GitBranch}>
                <p className="text-sm font-medium text-foreground">{prepPlan?.headline}</p>
                <div className="mt-3 space-y-2">
                  {(prepPlan?.focus ?? []).map((item: string) => (
                    <p key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                      {item}
                    </p>
                  ))}
                </div>
                <Button className="mt-4 w-full" onClick={startMock} isLoading={actionLoading === "mock"}>
                  <Play className="h-4 w-4" />
                  Start AI Mock
                </Button>
              </Panel>
            </div>
          </section>

          {solution && (
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-accent" />
                <h2 className="text-base font-semibold">Original AI Solution</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <SolutionBlock title="Brute Force" value={solution.bruteForce} />
                <SolutionBlock title="Optimized" value={solution.optimized} />
                <SolutionBlock title="Interviewer Expectations" value={solution.interviewerExpectations} />
                <SolutionBlock title="Follow-ups" value={solution.followUps} />
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Community Contribution" icon={MessageSquarePlus}>
              <Textarea
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
                placeholder="Share a question you were asked. Remove confidential details."
                className="min-h-[140px]"
              />
              <Button className="mt-3" onClick={submitContribution} isLoading={actionLoading === "contribute"}>
                Submit for Moderation
              </Button>
            </Panel>

            <Panel title="Mock Interview Session" icon={BarChart3}>
              {mockSession ? (
                <div className="rounded-lg border border-border bg-background p-4">
                  <Badge variant="success">Active</Badge>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {(mockSession.transcript ?? [])[0]?.text ?? "Mock session started."}
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Start a mock to get company-specific follow-ups, confidence scoring, transcript replay, and an improvement plan.
                </p>
              )}
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Icon className="h-4 w-4 text-accent" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="text-base font-semibold">{title}</h2>
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
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{width}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SolutionBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-medium">{title}</p>
      <pre className={cn("mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground")}>
        {typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}
