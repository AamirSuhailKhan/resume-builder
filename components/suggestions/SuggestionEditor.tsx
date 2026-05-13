"use client";

import { useEffect, useMemo, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { produce } from "immer";
import { Check, CheckCircle2, Eye, Pencil, RotateCcw, Save, X } from "lucide-react";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ResumeData } from "@/lib/storage";
import type { ResumeSuggestion, SuggestionSession, SuggestionStatus } from "@/types/suggestions";

type PathSegment = string | number;

interface SuggestionEditorProps {
  session: SuggestionSession;
  className?: string;
  persist?: boolean;
  onApplied?: (resume: ResumeData) => void;
}

type ApplyResponse = {
  data: {
    updatedResume: ResumeData;
    appliedCount: number;
    version: number;
  } | null;
  error: string | null;
};

function parsePath(path: string): PathSegment[] | null {
  if (!/^[a-zA-Z]+(?:\[\d+\]|\.[a-zA-Z0-9_]+|\.\d+)*$/.test(path)) return null;
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function splitSkills(value: string) {
  return value
    .split(/[\n,]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function readTarget(root: ResumeData, segments: PathSegment[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
    } else {
      if (!current || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

function writeTarget(root: ResumeData, segments: PathSegment[], value: string | string[]) {
  let current: unknown = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined) return false;
    if (typeof segment === "number") {
      if (!Array.isArray(current) || !current[segment]) return false;
      current = current[segment];
    } else {
      if (!current || typeof current !== "object") return false;
      current = (current as Record<string, unknown>)[segment];
    }
  }

  const last = segments[segments.length - 1];
  if (last === undefined) return false;
  if (typeof last === "number") {
    if (!Array.isArray(current)) return false;
    current[last] = value;
    return true;
  }

  if (!current || typeof current !== "object") return false;
  (current as Record<string, unknown>)[last] = value;
  return true;
}

function applySuggestion(draft: ResumeData, suggestion: Pick<ResumeSuggestion, "path" | "original" | "suggested">) {
  const segments = parsePath(suggestion.path);
  if (!segments) return;

  if (segments[0] === "skills" && segments.length === 1) {
    draft.skills = splitSkills(suggestion.suggested);
    return;
  }

  const current = readTarget(draft, segments);
  if (typeof current !== "string") return;

  const nextValue = suggestion.original && current.includes(suggestion.original)
    ? current.replace(suggestion.original, suggestion.suggested)
    : suggestion.suggested;

  writeTarget(draft, segments, nextValue);
}

function buildPreviewResume(base: ResumeData, suggestions: ResumeSuggestion[]) {
  return produce(base, (draft) => {
    for (const suggestion of suggestions) {
      if (suggestion.status !== "accepted" && suggestion.status !== "edited") continue;
      applySuggestion(draft, suggestion);
    }
    draft.updatedAt = new Date().toISOString();
  });
}

type DiffToken = {
  text: string;
  type: "same" | "added" | "removed";
};

function diffWords(original: string, suggested: string): DiffToken[] {
  const a = original.split(/(\s+)/).filter(Boolean);
  const b = suggested.split(/(\s+)/).filter(Boolean);
  const table = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let row = a.length - 1; row >= 0; row -= 1) {
    for (let col = b.length - 1; col >= 0; col -= 1) {
      table[row]![col] = a[row] === b[col]
        ? (table[row + 1]?.[col + 1] ?? 0) + 1
        : Math.max(table[row + 1]?.[col] ?? 0, table[row]?.[col + 1] ?? 0);
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      tokens.push({ text: a[i] ?? "", type: "same" });
      i += 1;
      j += 1;
    } else if ((table[i + 1]?.[j] ?? 0) >= (table[i]?.[j + 1] ?? 0)) {
      tokens.push({ text: a[i] ?? "", type: "removed" });
      i += 1;
    } else {
      tokens.push({ text: b[j] ?? "", type: "added" });
      j += 1;
    }
  }

  while (i < a.length) {
    tokens.push({ text: a[i] ?? "", type: "removed" });
    i += 1;
  }

  while (j < b.length) {
    tokens.push({ text: b[j] ?? "", type: "added" });
    j += 1;
  }

  return tokens;
}

function statusVariant(status: SuggestionStatus) {
  if (status === "accepted" || status === "edited") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

function AnimatedScore({ before, after }: { before: number; after: number }) {
  const value = useMotionValue(before);
  const rounded = useTransform(value, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(value, after, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [after, value]);

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Projected ATS score</span>
        <span>{before} {"->"} {after}</span>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <motion.span className="text-3xl font-black text-foreground">{rounded}</motion.span>
        <div className="mb-2 h-2 flex-1 rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-success"
            initial={{ width: `${before}%` }}
            animate={{ width: `${after}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function SuggestionDiff({ original, suggested }: { original: string; suggested: string }) {
  const tokens = useMemo(() => diffWords(original, suggested), [original, suggested]);

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm leading-6">
      {tokens.map((token, index) => (
        <span
          key={`${token.type}-${index}-${token.text}`}
          className={cn(
            token.type === "added" && "rounded bg-success/15 px-1 text-success",
            token.type === "removed" && "rounded bg-danger/10 px-1 text-danger line-through",
          )}
        >
          {token.text}
        </span>
      ))}
    </div>
  );
}

export function SuggestionEditor({ session, className, persist = true, onApplied }: SuggestionEditorProps) {
  const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>(session.suggestions);
  const [activeId, setActiveId] = useState(session.suggestions[0]?.id ?? "");
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSuggestions(session.suggestions);
    setActiveId(session.suggestions[0]?.id ?? "");
    setMessage(null);
  }, [session]);

  const activeSuggestion = suggestions.find((suggestion) => suggestion.id === activeId) ?? suggestions[0];
  const previewResume = useMemo(
    () => buildPreviewResume(session.resumeSnapshot, suggestions),
    [session.resumeSnapshot, suggestions],
  );
  const applyableSuggestions = suggestions.filter((suggestion) => suggestion.status === "accepted" || suggestion.status === "edited");
  const acceptedCount = applyableSuggestions.length;
  const rejectedCount = suggestions.filter((suggestion) => suggestion.status === "rejected").length;

  const updateSuggestion = (id: string, updater: (suggestion: ResumeSuggestion) => void) => {
    setSuggestions((current) => produce(current, (draft) => {
      const suggestion = draft.find((item) => item.id === id);
      if (!suggestion) return;
      updater(suggestion);
      suggestion.updatedAt = new Date().toISOString();
    }));
  };

  const setStatus = (id: string, status: SuggestionStatus) => {
    updateSuggestion(id, (suggestion) => {
      suggestion.status = status;
    });
  };

  const applyAccepted = async () => {
    if (!session.resumeId || acceptedCount === 0) return;
    setIsApplying(true);
    setMessage(null);

    try {
      const response = await fetch("/api/resume/apply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: session.resumeId,
          sessionId: session.id,
          resumeSnapshot: session.resumeSnapshot,
          suggestions: applyableSuggestions,
        }),
      });

      const payload = await response.json().catch(() => null) as ApplyResponse | null;
      if (!response.ok || payload?.error || !payload?.data) {
        throw new Error(payload?.error ?? "Could not apply suggestions.");
      }

      onApplied?.(payload.data.updatedResume);
      setMessage(`Applied ${payload.data.appliedCount} suggestion${payload.data.appliedCount === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not apply suggestions.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-surface text-foreground", className)}>
      <div className="flex flex-col gap-4 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-normal">AI suggestion review</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {acceptedCount} accepted, {rejectedCount} rejected, {suggestions.length} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session.scores && <AnimatedScore before={session.scores.before} after={session.scores.after} />}
          {persist && session.resumeId && (
            <Button onClick={applyAccepted} disabled={acceptedCount === 0} isLoading={isApplying}>
              <Save className="h-4 w-4" />
              Apply accepted
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="border-b border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="max-h-[720px] overflow-y-auto p-3">
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const isActive = suggestion.id === activeSuggestion?.id;
                return (
                  <motion.article
                    key={suggestion.id}
                    layout
                    className={cn(
                      "rounded-lg border bg-surface p-3 transition-colors",
                      isActive ? "border-primary/60 shadow-sm" : "border-border",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setActiveId(suggestion.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold capitalize">{suggestion.section}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{suggestion.path}</div>
                        </div>
                        <Badge variant={statusVariant(suggestion.status)}>{suggestion.status}</Badge>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{suggestion.rationale}</p>
                    </button>

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 space-y-3"
                      >
                        <SuggestionDiff original={suggestion.original} suggested={suggestion.suggested} />
                        <Textarea
                          value={suggestion.suggested}
                          onChange={(event) => updateSuggestion(suggestion.id, (draft) => {
                            draft.suggested = event.target.value;
                            if (draft.status !== "accepted") draft.status = "edited";
                          })}
                          rows={4}
                        />
                        {suggestion.impact && (
                          <p className="text-xs leading-5 text-muted-foreground">{suggestion.impact}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => setStatus(suggestion.id, "accepted")}>
                            <Check className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(suggestion.id, "rejected")}>
                            <X className="h-4 w-4" />
                            Reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(suggestion.id, "pending")}>
                            <RotateCcw className="h-4 w-4" />
                            Reset
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(suggestion.id, "edited")}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-surface-muted p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Live preview</div>
            <div className="inline-flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-4 w-4" />
              {acceptedCount} change{acceptedCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="h-[650px] overflow-auto rounded-lg border border-border bg-white">
            <div className="origin-top-left scale-[0.52]">
              <ResumePreview data={previewResume} renderMode="preview" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
