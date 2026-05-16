"use client";

import { ChevronDown, PlayCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Brief = {
  companyName: string;
  rounds?: number | null;
  roundDescriptions: Array<{ round?: number; type?: string; duration?: string; notes?: string }>;
  questionThemes: string[];
  knownQuestions: string[];
  difficulty?: string | null;
  avgTimelineDays?: number | null;
  interviewTips: string[];
};

export function CompanyInterviewBriefCard({ brief, onPracticeQuestion }: { brief: Brief; onPracticeQuestion?: (question: string) => void }) {
  const [open, setOpen] = useState(true);
  const steps = brief.roundDescriptions.length > 0
    ? brief.roundDescriptions
    : [{ type: "Screen" }, { type: "Technical" }, { type: "System Design" }, { type: "Offer" }];

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{brief.companyName} interview brief</CardTitle>
          <Badge variant={brief.difficulty === "hard" ? "danger" : brief.difficulty === "easy" ? "success" : "warning"}>
            {brief.difficulty ?? "medium"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          {steps.slice(0, 4).map((step, index) => (
            <div key={`${step.type}-${index}`} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Round {step.round ?? index + 1}</p>
              <p className="mt-1 text-sm font-medium capitalize text-foreground">{step.type ?? "Interview"}</p>
              {step.duration && <p className="mt-1 text-xs text-muted-foreground">{step.duration}</p>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {brief.questionThemes.map((theme) => <Badge key={theme}>{theme}</Badge>)}
          {brief.avgTimelineDays && <Badge>Avg. {brief.avgTimelineDays} days from apply to offer</Badge>}
        </div>

        <button type="button" onClick={() => setOpen((current) => !current)} className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ChevronDown className={open ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
          Candidate-reported practice themes
        </button>

        {open && (
          <div className="space-y-2">
            {(brief.knownQuestions.length > 0 ? brief.knownQuestions : ["Tell me about a project with meaningful tradeoffs."]).map((question) => (
              <div key={question} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">{question}</p>
                <Button size="sm" variant="outline" onClick={() => onPracticeQuestion?.(question)}>
                  <PlayCircle className="h-4 w-4" />
                  Practice this
                </Button>
              </div>
            ))}
          </div>
        )}

        <ol className="grid gap-2 md:grid-cols-2">
          {brief.interviewTips.map((tip, index) => (
            <li key={tip} className="rounded-lg border border-border bg-surface p-3 text-sm leading-6 text-muted-foreground">
              {index + 1}. {tip}
            </li>
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">Data sourced from public candidate reports such as Glassdoor, Blind, and LeetCode. Treat it as directional, not guaranteed.</p>
      </CardContent>
    </Card>
  );
}
