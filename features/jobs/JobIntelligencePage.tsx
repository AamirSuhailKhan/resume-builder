"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, CheckCircle2, Loader2, Sparkles, Target, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionShell } from "@/components/features/section-shell";
import { parsedJob } from "@/features/platform/data";

const sampleJD = `Senior Frontend Engineer

We are looking for a product-minded engineer to build polished dashboard workflows with React, Next.js, TypeScript, Prisma, PostgreSQL, queues, and strong UX judgment. You will own performance, accessibility, reusable components, and AI-assisted product surfaces.`;

export function JobIntelligencePage() {
  const [jd, setJd] = useState(sampleJD);
  const [status, setStatus] = useState<"idle" | "queued" | "done">("done");

  const match = useMemo(() => {
    const text = jd.toLowerCase();
    const hits = parsedJob.skills.filter((skill) => text.includes(skill.toLowerCase())).length;
    return Math.min(96, 62 + hits * 7);
  }, [jd]);

  const analyze = async () => {
    setStatus("queued");
    await fetch("/api/ai/job-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: jd }),
    }).catch(() => undefined);
    window.setTimeout(() => setStatus("done"), 900);
  };

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Job Intelligence"
        title="Turn any job description into a hiring signal map."
        description="Parse requirements into structured skills, tools, experience expectations, match score, and gaps you can immediately close in your resume."
        action={
          <Button onClick={analyze} isLoading={status === "queued"}>
            <Wand2 className="h-4 w-4" />
            Analyze JD
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={jd}
              onChange={(event) => setJd(event.target.value)}
              className="min-h-[420px] resize-none border-border bg-background/55 text-sm leading-6"
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card variant="glass" className="overflow-hidden">
            <CardHeader>
              <CardTitle>Match Percentage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-5">
                <div className="relative grid h-32 w-32 place-items-center rounded-full border border-border bg-surface">
                  <div
                    className="absolute inset-2 rounded-full"
                    style={{
                      background: `conic-gradient(var(--accent) ${match * 3.6}deg, var(--surface-muted) 0deg)`,
                    }}
                  />
                  <div className="relative grid h-24 w-24 place-items-center rounded-full bg-surface-elevated">
                    <span className="text-3xl font-semibold">{match}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge variant="success">Strong fit</Badge>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Your active profile aligns with the core product engineering signals. Close the missing skill gaps before applying.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {status === "queued" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground"
              >
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-accent" />
                AI analysis queued. Worker will persist structured output when complete.
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2">
                <ParsedCard title="Skills" items={parsedJob.skills} />
                <ParsedCard title="Tools" items={parsedJob.tools} />
                <ParsedCard title="Experience" items={parsedJob.experience} className="sm:col-span-2" />
                <ParsedCard title="Missing Skills" items={parsedJob.missing} tone="danger" className="sm:col-span-2" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionShell>
  );
}

function ParsedCard({
  title,
  items,
  tone = "neutral",
  className,
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "danger";
  className?: string;
}) {
  return (
    <Card variant="bordered" className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {tone === "danger" ? <Target className="h-4 w-4 text-danger" /> : <CheckCircle2 className="h-4 w-4 text-accent" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={tone === "danger" ? "danger" : "neutral"}>
            <Sparkles className="mr-1 h-3 w-3" />
            {item}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
