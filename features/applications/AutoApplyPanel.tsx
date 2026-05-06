"use client";

import { useState } from "react";
import { Mail, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionShell } from "@/components/features/section-shell";

const previews = {
  resume: "Tailored resume preview\n\nSenior Frontend Engineer with 6+ years building fast, accessible product workflows in React, Next.js, TypeScript, Prisma, and PostgreSQL...",
  cover: "Dear Hiring Team,\n\nI am excited about the Senior Frontend Engineer role because it combines product-quality UI craft, platform thinking, and measurable performance work...",
  email: "Subject: Senior Frontend Engineer application\n\nHi team,\n\nI am sharing my resume for the Senior Frontend Engineer role. My recent work maps closely to your requirements across Next.js, design systems, queues, and polished dashboard UX.\n\nBest,\nAamir",
};

export function AutoApplyPanel() {
  const [tab, setTab] = useState<"resume" | "cover" | "email">("resume");
  const [content, setContent] = useState(previews.resume);
  const [queued, setQueued] = useState(false);

  const switchTab = (next: string) => {
    const value = next as keyof typeof previews;
    setTab(value);
    setContent(previews[value]);
  };

  const apply = async () => {
    setQueued(true);
    await fetch("/api/ai/auto-apply", { method: "POST", body: JSON.stringify({ preview: content }) }).catch(() => undefined);
    window.setTimeout(() => setQueued(false), 900);
  };

  return (
    <SectionShell>
      <PageHeader
        eyebrow="Auto Apply"
        title="Review the application kit before it leaves the building."
        description="AI generates structured resume, cover letter, and email drafts. You keep final editorial control before queueing the apply workflow."
        action={
          <Button onClick={apply} isLoading={queued}>
            <Send className="h-4 w-4" />
            One-click apply
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Application Package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              tabs={[
                { id: "resume", label: "Resume" },
                { id: "cover", label: "Cover" },
                { id: "email", label: "Email" },
              ]}
              activeTab={tab}
              onChange={switchTab}
            />
            <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <Badge variant="success">ATS optimized</Badge>
              <p className="text-sm leading-6 text-muted-foreground">Includes rewritten opening summary, role-specific proof points, and a concise hiring-manager email.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Queue path</p>
              <p className="text-sm text-foreground">API &gt; BullMQ &gt; isolated worker &gt; DB</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tab === "email" ? <Mail className="h-4 w-4 text-accent" /> : <Sparkles className="h-4 w-4 text-accent" />}
              Editable Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[520px] resize-none bg-background/60 leading-6" />
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}
