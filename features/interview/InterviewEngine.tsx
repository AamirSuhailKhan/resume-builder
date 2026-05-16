"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { CompanyInterviewBriefCard } from "@/components/interview/CompanyInterviewBriefCard";
import { cn } from "@/lib/utils";

type Phase = "setup" | "interview" | "results";

type InterviewQuestion = {
  id: string;
  type: string;
  question: string;
  signal: string;
  followUp?: string;
};

type AnswerMap = Record<string, string>;

type RubricPoint = {
  metric: string;
  score: number;
  feedback: string;
};

type EvaluationResult = {
  sessionId: string;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextDrill: string;
  rubric: RubricPoint[];
  radar: Array<{ metric: string; score: number }>;
};

type CompanyBrief = {
  companyName: string;
  rounds?: number | null;
  roundDescriptions: Array<{ round?: number; type?: string; duration?: string; notes?: string }>;
  questionThemes: string[];
  knownQuestions: string[];
  difficulty?: string | null;
  avgTimelineDays?: number | null;
  interviewTips: string[];
};

type SpeechRecognitionResultLike = {
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  results?: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const focusOptions = ["Behavioral", "System design", "Technical depth", "Product sense", "Recruiter screen"];
const difficultyOptions = ["Entry", "Mid-level", "Senior", "Staff"];

export function InterviewEngine() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [company, setCompany] = useState("");
  const [companyBrief, setCompanyBrief] = useState<CompanyBrief | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Mid-level");
  const [focusAreas, setFocusAreas] = useState<string[]>(["Behavioral", "Technical depth"]);
  const [questionCount, setQuestionCount] = useState(5);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseRef = useRef("");

  const activeQuestion = questions[activeIndex];
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] ?? "" : "";
  const answeredCount = questions.filter((question) => (answers[question.id] ?? "").trim().length > 0).length;
  const completion = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const canEvaluate = useMemo(
    () => questions.length > 0 && questions.every((question) => (answers[question.id] ?? "").trim().length >= 20),
    [answers, questions]
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const name = company.trim();
    if (name.length < 2) {
      setCompanyBrief(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsBriefLoading(true);
      fetch(`/api/v1/interview/company-brief?companyName=${encodeURIComponent(name)}`)
        .then((response) => response.json())
        .then((payload) => setCompanyBrief(payload.brief ?? null))
        .catch(() => setCompanyBrief(null))
        .finally(() => setIsBriefLoading(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [company]);

  async function generateQuestions() {
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/interview/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company,
          companyName: company,
          role,
          jobDescription,
          difficulty,
          focusAreas,
          questionCount,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        sessionId?: string;
        questions?: InterviewQuestion[];
        companyBrief?: CompanyBrief | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate questions.");
      }

      if (!payload.sessionId || !Array.isArray(payload.questions) || payload.questions.length === 0) {
        throw new Error("The interview service returned an incomplete session.");
      }

      setSessionId(payload.sessionId);
      setCompanyBrief(payload.companyBrief ?? companyBrief);
      setQuestions(payload.questions);
      setAnswers({});
      setActiveIndex(0);
      setResult(null);
      setPhase("interview");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate questions.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function evaluateAnswers() {
    setError(null);
    setIsEvaluating(true);
    setIsListening(false);
    recognitionRef.current?.stop();

    try {
      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          company,
          companyName: company,
          role,
          jobDescription,
          answers: questions.map((question) => ({
            questionId: question.id,
            question: question.question,
            answer: answers[question.id] ?? "",
          })),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<EvaluationResult> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to evaluate answers.");
      }

      if (!payload.sessionId || typeof payload.score !== "number") {
        throw new Error("The evaluation service returned an incomplete result.");
      }

      setResult({
        sessionId: payload.sessionId,
        score: payload.score,
        summary: payload.summary ?? "Evaluation complete.",
        strengths: payload.strengths ?? [],
        improvements: payload.improvements ?? [],
        nextDrill: payload.nextDrill ?? "Repeat the weakest answer with clearer metrics.",
        rubric: payload.rubric ?? [],
        radar: payload.radar ?? [],
      });
      setSessionId(payload.sessionId);
      setPhase("results");
    } catch (evaluateError) {
      setError(evaluateError instanceof Error ? evaluateError.message : "Unable to evaluate answers.");
    } finally {
      setIsEvaluating(false);
    }
  }

  function updateActiveAnswer(value: string) {
    if (!activeQuestion) return;
    setAnswers((current) => ({
      ...current,
      [activeQuestion.id]: value,
    }));
  }

  function toggleFocus(area: string) {
    setFocusAreas((current) => (
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area]
    ));
  }

  function toggleMic() {
    if (!activeQuestion) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setMicNotice("Speech input is unavailable in this browser. You can type the answer here.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setMicNotice("Speech input stopped. You can continue typing.");
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      const transcripts: string[] = [];

      if (event.results) {
        for (let index = 0; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript;
          if (transcript) transcripts.push(transcript);
        }
      }

      if (transcripts.length > 0) {
        updateActiveAnswer(`${speechBaseRef.current ? `${speechBaseRef.current} ` : ""}${transcripts.join(" ")}`.trim());
      }
    };

    recognitionRef.current = recognition;
    speechBaseRef.current = activeAnswer.trim();
    setMicNotice(null);
    setIsListening(true);
    recognition.start();
  }

  function resetPractice() {
    setPhase("setup");
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setActiveIndex(0);
    setResult(null);
    setError(null);
    setMicNotice(null);
    setIsListening(false);
    recognitionRef.current?.stop();
  }

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Interview Engine"
        title="Practice against the role, not generic questions."
        description="Claude generates targeted prompts and evaluates your answers against the signals hiring teams actually listen for."
      />

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {phase === "setup" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Session setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role">
                  <Input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Senior frontend engineer" />
                </Field>
                <Field label="Company">
                  <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Acme AI" />
                </Field>
              </div>

              {isBriefLoading && <div className="h-28 animate-pulse rounded-lg bg-surface-muted" />}
              {companyBrief && (
                <CompanyInterviewBriefCard
                  brief={companyBrief}
                  onPracticeQuestion={(question) => setJobDescription((current) => `${current ? `${current}\n\n` : ""}Practice focus: ${question}`)}
                />
              )}

              <Field label="Job description">
                <Textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  className="min-h-[210px] resize-none leading-6"
                  placeholder="Paste the role description or the key responsibilities."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <Field label="Difficulty">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {difficultyOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDifficulty(option)}
                        className={cn(
                          "h-10 rounded-lg border px-3 text-sm font-medium transition-colors focus-premium",
                          difficulty === option
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Questions">
                  <Input
                    type="number"
                    min={3}
                    max={8}
                    value={questionCount}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setQuestionCount(Number.isFinite(nextValue) ? nextValue : 3);
                    }}
                  />
                </Field>
              </div>

              <Field label="Focus areas">
                <div className="flex flex-wrap gap-2">
                  {focusOptions.map((area) => {
                    const selected = focusAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleFocus(area)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-premium",
                          selected
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Button onClick={generateQuestions} disabled={!role.trim()} isLoading={isGenerating}>
                <Sparkles className="h-4 w-4" />
                Generate practice
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Session signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SetupSignal label="Model" value="Claude Sonnet 4" />
              <SetupSignal label="Question mix" value={focusAreas.length > 0 ? focusAreas.join(", ") : "Role-led"} />
              <SetupSignal label="Target level" value={difficulty} />
              <SetupSignal label="Output" value="Questions, rubric, radar feedback" />
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "interview" && activeQuestion && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card variant="elevated" className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-accent" />
                  Question {activeIndex + 1} of {questions.length}
                </CardTitle>
                <Badge variant="primary">{activeQuestion.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-border bg-surface-muted p-5 text-base font-medium leading-8 text-foreground sm:text-lg">
                {activeQuestion.question}
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Hiring signal</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeQuestion.signal}</p>
                {activeQuestion.followUp && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    <span className="text-foreground">Follow-up:</span> {activeQuestion.followUp}
                  </p>
                )}
              </div>

              <Textarea
                value={activeAnswer}
                onChange={(event) => updateActiveAnswer(event.target.value)}
                className="min-h-[300px] resize-none leading-6"
                placeholder="Answer as if you were speaking live. Include context, choices, tradeoffs, and outcome."
              />

              {micNotice && <p className="text-sm text-muted-foreground">{micNotice}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                    disabled={activeIndex === 0}
                    aria-label="Previous question"
                    title="Previous question"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setActiveIndex((current) => Math.min(questions.length - 1, current + 1))}
                    disabled={activeIndex === questions.length - 1}
                    aria-label="Next question"
                    title="Next question"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isListening ? "danger" : "outline"}
                    size="icon"
                    onClick={toggleMic}
                    aria-label={isListening ? "Stop recording" : "Use speech input"}
                    title={isListening ? "Stop recording" : "Use speech input"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>

                <Button onClick={evaluateAnswers} disabled={!canEvaluate} isLoading={isEvaluating}>
                  <Send className="h-4 w-4" />
                  Evaluate answers
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-border bg-surface p-5">
                <p className="text-sm text-muted-foreground">Answered</p>
                <p className="mt-2 text-4xl font-semibold text-foreground">{completion}%</p>
                <div className="mt-4 h-2 rounded-full bg-surface-muted">
                  <motion.div className="h-2 rounded-full bg-accent" animate={{ width: `${completion}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {questions.map((question, index) => {
                  const done = (answers[question.id] ?? "").trim().length > 0;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-premium",
                        index === activeIndex
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface hover:bg-surface-muted"
                      )}
                    >
                      <CheckCircle2 className={cn("h-4 w-4 shrink-0", done ? "text-success" : "text-muted-foreground")} />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{question.question}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "results" && result && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Interview score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-border bg-surface p-5 text-center">
                <AnimatedScore score={result.score} />
                <div className="mt-4 h-2 rounded-full bg-surface-muted">
                  <motion.div
                    className="h-2 rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">{result.summary}</p>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setPhase("interview")}>
                  <ArrowLeft className="h-4 w-4" />
                  Edit answers
                </Button>
                <Button variant="secondary" onClick={resetPractice}>
                  <RotateCcw className="h-4 w-4" />
                  New session
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Card variant="elevated" className="min-w-0">
              <CardHeader>
                <CardTitle>Signal radar</CardTitle>
              </CardHeader>
              <CardContent className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={result.radar.length > 0 ? result.radar : result.rubric}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Radar dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.24} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Next drill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FeedbackBlock label="Strong" values={result.strengths} variant="success" />
                <FeedbackBlock label="Improve" values={result.improvements} variant="warning" />
                <div className="rounded-lg border border-border bg-surface p-4">
                  <Badge variant="primary">Drill</Badge>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.nextDrill}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Rubric notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {result.rubric.map((point) => (
                <div key={point.metric} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{point.metric}</p>
                    <Badge variant={point.score >= 75 ? "success" : point.score >= 55 ? "warning" : "danger"}>{point.score}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{point.feedback}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </SectionShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function SetupSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function AnimatedScore({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayScore(Math.round(latest)),
    });

    return () => controls.stop();
  }, [score]);

  return (
    <p className="text-5xl font-semibold tracking-normal text-foreground">
      {displayScore}
      <span className="text-2xl text-muted-foreground">%</span>
    </p>
  );
}

function FeedbackBlock({
  label,
  values,
  variant,
}: {
  label: string;
  values: string[];
  variant: "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Badge variant={variant}>{label}</Badge>
      <div className="mt-3 space-y-2">
        {values.map((value) => (
          <p key={value} className="text-sm leading-6 text-muted-foreground">
            {value}
          </p>
        ))}
      </div>
    </div>
  );
}
