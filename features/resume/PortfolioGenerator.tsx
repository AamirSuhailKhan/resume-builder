"use client";

import { useState } from "react";
import { Globe2, Palette, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { PageHeader, SectionShell } from "@/components/features/section-shell";

const themes = [
  { label: "Editorial", value: "editorial" },
  { label: "Studio", value: "studio" },
  { label: "Operator", value: "operator" },
];

export function PortfolioGenerator() {
  const [theme, setTheme] = useState("editorial");
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    setPublishing(true);
    await fetch("/api/ai/portfolio", { method: "POST", body: JSON.stringify({ theme }) }).catch(() => undefined);
    window.setTimeout(() => setPublishing(false), 1000);
  };

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Portfolio Generator"
        title="Publish a role-specific portfolio without leaving the workspace."
        description="Generate a polished personal site from your resume, proof points, projects, and target role."
        action={
          <Button onClick={publish} isLoading={publishing}>
            <Rocket className="h-4 w-4" />
            Publish
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" />
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Dropdown label="Visual direction" items={themes} value={theme} onChange={setTheme} />
            <div className="grid grid-cols-3 gap-2">
              <span className="h-14 rounded-lg border border-border bg-foreground" />
              <span className="h-14 rounded-lg border border-border bg-accent" />
              <span className="h-14 rounded-lg border border-border bg-surface-muted" />
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <Badge variant="primary">Draft domain</Badge>
              <p className="mt-3 text-sm text-foreground">aamir.resumeai.site</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-accent" />
              Generated Site Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
              </div>
              <div className="grid gap-8 p-6 sm:p-8">
                <section className="grid gap-4 sm:grid-cols-[1fr_220px] sm:items-end">
                  <div>
                    <Badge variant="success">Available for senior frontend roles</Badge>
                    <h2 className="mt-5 text-4xl font-semibold tracking-normal text-foreground">Aamir builds polished AI product systems.</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Frontend and platform engineer focused on Next.js, stateful editors, queue-backed AI workflows, and premium SaaS interfaces.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Signature project</p>
                    <p className="mt-3 text-lg font-semibold text-foreground">AI Resume OS</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Autosave, Prisma, BullMQ, worker isolation, and structured AI outputs.</p>
                  </div>
                </section>
                <section className="grid gap-3 sm:grid-cols-3">
                  {["Design systems", "AI workflows", "Performance"].map((item) => (
                    <div key={item} className="rounded-lg border border-border bg-surface p-4 text-sm font-medium text-foreground">
                      {item}
                    </div>
                  ))}
                </section>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}
