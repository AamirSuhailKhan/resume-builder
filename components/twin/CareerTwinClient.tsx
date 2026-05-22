"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Eye,
  Gauge,
  GitBranch,
  Lock,
  Play,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// The Twin payload is intentionally schema-flexible because most explainability
// evidence is stored as JSON and evolves independently of the UI release cycle.
/* eslint-disable @typescript-eslint/no-explicit-any */
type JsonRecord = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

type CareerTwinSnapshot = JsonRecord & {
  id: string;
  displayName: string;
  status: string;
  autonomyMode: string;
  professionalIdentity: JsonRecord;
  cognitiveProfile: JsonRecord;
  scores: JsonRecord;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  bestFitRoles: Array<{ role: string; fit: number; reason: string }>;
  hiddenOpportunities: Array<{ title: string; reason: string; confidence: number }>;
  salaryProjection: JsonRecord;
  activePlan: JsonRecord;
  privacyControls: JsonRecord;
  memories: JsonRecord[];
  insights: JsonRecord[];
  predictions: JsonRecord[];
  emotionalStates: JsonRecord[];
  learningVelocities: JsonRecord[];
  skillGaps: JsonRecord[];
  trajectories: JsonRecord[];
  simulations: JsonRecord[];
  events: JsonRecord[];
};

type ApiResponse<T> = { data: T | null; error: string | null };

const privacyToggles: Array<[string, string]> = [
  ["memoryEnabled", "Persistent memory"],
  ["aiTrainingAllowed", "Allow AI training"],
  ["sensitiveFieldsRequireApproval", "Approval for sensitive fields"],
  ["executionReplayEnabled", "Execution replay"],
];

function percent(value: unknown) {
  const number = typeof value === "number" ? value : 0;
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`;
}

function scoreLabel(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) ? `${Math.round(number)}%` : "0%";
}

function predictionLabel(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSalaryText(twin: CareerTwinSnapshot) {
  const current = twin.salaryProjection?.currentMarket;
  if (!current) return "Calibrating";
  return `${current.p50 ?? "-"} ${twin.salaryProjection.unit ?? "LPA"} median`;
}

function TwinMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "warn" }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-1 truncate text-xl font-semibold tracking-normal",
        tone === "good" && "text-success",
        tone === "warn" && "text-warning"
      )}>
        {value}
      </p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(Math.max(0, Math.min(100, value)))}%` }} />
    </div>
  );
}

export function CareerTwinClient({ initialTwin }: { initialTwin: CareerTwinSnapshot }) {
  const [twin, setTwin] = useState(initialTwin);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulationQuestion, setSimulationQuestion] = useState("If I learn GenAI in 6 months, what salary becomes possible?");
  const [targetSkill, setTargetSkill] = useState("GenAI");
  const [events, setEvents] = useState<JsonRecord[]>(initialTwin.events ?? []);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const topPredictions = (twin.predictions ?? []).slice(0, 6);

  useEffect(() => {
    const source = new EventSource("/api/v1/events/stream");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        setEvents((current) => [event, ...current].slice(0, 18));
        const screenshot = event?.payload?.screenshotUrl ?? event?.payload?.storageKey;
        if (typeof screenshot === "string") setLastScreenshot(screenshot);
      } catch {
        // Ignore malformed heartbeats from older worker versions.
      }
    };
    return () => source.close();
  }, []);

  async function refreshTwin() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/v1/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_refresh" }),
      });
      const json = await res.json() as ApiResponse<CareerTwinSnapshot>;
      if (json.data) setTwin(json.data);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function runSimulation() {
    const res = await fetch("/api/v1/twin/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: simulationQuestion,
        targetSkill,
        horizonMonths: 6,
      }),
    });
    const json = await res.json() as ApiResponse<JsonRecord>;
    const simulation = json.data;
    if (!simulation) return;
    setTwin((current) => ({
      ...current,
      simulations: [simulation, ...(current.simulations ?? [])].slice(0, 4),
    }));
  }

  async function updatePrivacy(key: string, value: boolean) {
    const next = { ...twin.privacyControls, [key]: value };
    setTwin((current) => ({ ...current, privacyControls: next }));
    await fetch("/api/v1/twin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  return (
    <div className="container-premium space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-surface-elevated p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="success">Active Twin</Badge>
                <Badge variant="primary">{twin.autonomyMode}</Badge>
                <Badge>{Math.round(twin.confidence * 100)}% confidence</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                AI Career Twin
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {twin.professionalIdentity?.role ?? "Professional identity"} tuned toward{" "}
                {twin.professionalIdentity?.specialization ?? "your next best career move"}.
              </p>
            </div>
            <Button onClick={refreshTwin} isLoading={isRefreshing} size="lg">
              <RefreshCcw className="h-4 w-4" />
              Evolve Twin
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TwinMetric label="Identity" value={scoreLabel(twin.scores?.identityCompleteness)} tone="good" />
            <TwinMetric label="Market Readiness" value={scoreLabel(twin.scores?.marketReadiness)} />
            <TwinMetric label="Recruiter Resonance" value={scoreLabel(twin.scores?.recruiterResonance)} />
            <TwinMetric label="Salary Signal" value={getSalaryText(twin)} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">Identity Core</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Role", twin.professionalIdentity?.role],
              ["Seniority", twin.professionalIdentity?.seniority],
              ["Specialization", twin.professionalIdentity?.specialization],
              ["Orientation", twin.cognitiveProfile?.orientation],
              ["Risk tolerance", twin.cognitiveProfile?.riskTolerance],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium text-foreground">{value ?? "Learning"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold">Career Strategy</h2>
            </div>
            <Link href="/matches" className="text-sm text-accent hover:underline">Find roles</Link>
          </div>
          <div className="space-y-3">
            {(twin.bestFitRoles ?? []).map((role) => (
              <div key={role.role} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{role.role}</p>
                  <span className="text-sm text-accent">{percent(role.fit)} fit</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">Outcome Predictions</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {topPredictions.map((prediction) => (
              <div key={`${prediction.predictionType}-${prediction.id ?? prediction.createdAt}`} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{predictionLabel(prediction.predictionType)}</p>
                  <span className="text-sm font-semibold text-foreground">{percent(prediction.score)}</span>
                </div>
                <ProgressBar value={(prediction.score ?? 0) * 100} />
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{prediction.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h2 className="text-base font-semibold">Strengths</h2>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
            {(twin.strengths ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-warning" />
            <h2 className="text-base font-semibold">Growth Edges</h2>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
            {(twin.weaknesses ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">Hidden Opportunities</h2>
          </div>
          <div className="space-y-3">
            {(twin.hiddenOpportunities ?? []).map((item) => (
              <div key={item.title}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs leading-5 text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Route className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">Trajectory Simulator</h2>
          </div>
          <div className="space-y-3">
            <Textarea value={simulationQuestion} onChange={(event) => setSimulationQuestion(event.target.value)} />
            <Input value={targetSkill} onChange={(event) => setTargetSkill(event.target.value)} placeholder="Target skill" />
            <Button onClick={runSimulation}>
              <Play className="h-4 w-4" />
              Simulate Path
            </Button>
          </div>
          {twin.simulations?.[0] && (
            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <p className="text-sm font-medium">Latest simulation</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{twin.simulations[0].recommendation}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Projected salary: {twin.simulations[0].projection?.salary?.projectedP50 ?? "-"}{" "}
                {twin.simulations[0].projection?.salary?.unit ?? "LPA"}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">Learning And Skill Gaps</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(twin.skillGaps ?? []).map((gap) => (
              <div key={gap.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{gap.skill}</p>
                  <span className="text-xs text-muted-foreground">Priority {percent(gap.priority)}</span>
                </div>
                <ProgressBar value={(gap.priority ?? 0) * 100} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">Trust And Privacy</h2>
          </div>
          <div className="space-y-3">
            {privacyToggles.map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {label}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(twin.privacyControls?.[key])}
                  onChange={(event) => updatePrivacy(key, event.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold">Live Execution View</h2>
            </div>
            <Badge variant="success">SSE connected</Badge>
          </div>
          <div className="grid min-h-[360px] gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3 overflow-hidden rounded-lg border border-border bg-background p-4">
              {events.slice(0, 8).map((event, index) => (
                <div key={`${event.id ?? event.type}-${index}`} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{event.payload?.title ?? event.type ?? "Twin event"}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {event.createdAt ? new Date(event.createdAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {event.payload?.summary ?? event.summary ?? event.source ?? "Watching approval-safe execution."}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border bg-background p-4">
              {lastScreenshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lastScreenshot} alt="Latest execution screenshot" className="max-h-[320px] rounded-lg border border-border object-contain" />
              ) : (
                <div className="text-center">
                  <GitBranch className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No browser replay active</p>
                  <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                    When an approved workflow runs, screenshots, DOM actions, reasoning, and checkpoints appear here.
                  </p>
                  <Link href="/auto-apply" className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:underline">
                    Start an approved workflow <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold">Career Memory Graph</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(twin.memories ?? []).map((memory) => (
            <div key={memory.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{memory.title}</p>
                <span className="text-xs text-muted-foreground">{memory.type}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{memory.summary ?? memory.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
