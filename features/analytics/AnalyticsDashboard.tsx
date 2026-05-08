"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { ArrowUpRight, LineChart, Percent, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionShell } from "@/components/features/section-shell";

export function AnalyticsDashboard({ trendData, metrics }: { trendData: any[], metrics: { responseRate: string, resumeScore: string, interviewPace: string } }) {
  return (
    <SectionShell>
      <PageHeader
        eyebrow="Analytics"
        title="Measure the job search like a funnel."
        description="Track response rate, resume quality, interviews, and improvement trends so each week gets sharper."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Response rate" value={metrics.responseRate} detail="+11 pts in 14 days" icon={<Percent className="h-4 w-4" />} />
        <Metric title="Resume score" value={metrics.resumeScore} detail="ATS + human readability" icon={<Star className="h-4 w-4" />} />
        <Metric title="Interview pace" value={metrics.interviewPace} detail="Active loops this week" icon={<LineChart className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Improvement Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: -20, right: 12, top: 10 }}>
                <defs>
                  <linearGradient id="score" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="resumeScore" stroke="var(--accent)" fill="url(#score)" strokeWidth={2} />
                <Area type="monotone" dataKey="responseRate" stroke="var(--color-primary-400)" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Interview Momentum</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ left: -20, right: 8, top: 10 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="interviews" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

function Metric({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-accent">{icon}</div>
          <Badge variant="success">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            Live
          </Badge>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
