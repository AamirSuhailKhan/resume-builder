"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionShell } from "@/components/features/section-shell";

const questions = [
  "Walk me through a product surface you improved from average to excellent. What did you measure?",
  "How would you design an autosave system for a resume editor used by thousands of concurrent users?",
  "Tell me about a time you balanced craft, scope, and performance under a hard deadline.",
];

export function InterviewEngine() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("I would start by clarifying the success metric, then map the user journey and identify the highest-friction steps...");
  const score = useMemo(() => Math.min(92, 58 + Math.floor(answer.length / 12)), [answer]);

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Interview Engine"
        title="Practice against the role, not generic questions."
        description="Answer product, system design, behavioral, and recruiter prompts with instant feedback mapped to hiring signals."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-accent" />
              Question {index + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-surface-muted p-5 text-lg font-medium leading-8 text-foreground">
              {questions[index]}
            </div>
            <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-[320px] resize-none leading-6" />
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={() => setIndex((current) => (current + questions.length - 1) % questions.length)}>Previous</Button>
              <Button onClick={() => setIndex((current) => (current + 1) % questions.length)}>
                <Send className="h-4 w-4" />
                Next question
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-sm text-muted-foreground">Answer strength</p>
              <p className="mt-2 text-4xl font-semibold text-foreground">{score}%</p>
              <div className="mt-4 h-2 rounded-full bg-surface-muted">
                <motion.div className="h-2 rounded-full bg-accent" animate={{ width: `${score}%` }} />
              </div>
            </div>
            <FeedbackPoint label="Strong" value="You explain process and ownership clearly." />
            <FeedbackPoint label="Improve" value="Add a metric, tradeoff, and final business result." />
            <FeedbackPoint label="Next drill" value="Answer with situation, decision, outcome in under 90 seconds." />
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

function FeedbackPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Badge variant={label === "Strong" ? "success" : "primary"}>{label}</Badge>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}
