"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Send, Target, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HealthPayload = {
  analytics: {
    totalApplied: number;
    totalResponses: number;
    totalInterviews: number;
    totalOffers: number;
    responseRate: number;
    interviewRate: number;
    avgDaysToResponse: number | null;
    bestDayOfWeek: string | null;
    bestPlatform: string | null;
  };
  benchmark: {
    responseRate: number;
    interviewRate: number;
    avgDaysToOffer: number;
  };
  comparison: {
    responseRateDelta: number;
    interviewRateDelta: number;
    verdict: "above" | "at" | "below";
  };
};

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function recommendation(data: HealthPayload) {
  if (data.analytics.responseRate < data.benchmark.responseRate) {
    return [
      "Tailor the first third of your resume more tightly to each role.",
      "Prioritize fresh postings where your core skills appear in the job title or first paragraph.",
      "Add a short follow-up note for applications older than 5 business days.",
    ];
  }
  if (data.analytics.interviewRate < data.benchmark.interviewRate) {
    return [
      "Improve proof points in your top two experience bullets.",
      "Apply through company sites or warm paths where possible.",
      "Practice a concise story for why this role matches your recent work.",
    ];
  }
  return [
    "Keep the current targeting pattern; your funnel is performing well.",
    "Double down on the platform producing the most replies.",
    "Prepare interview stories now so response momentum converts.",
  ];
}

export function ApplicationHealthDashboard() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/analytics/health")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setData(payload as HealthPayload);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load application health.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendations = useMemo(() => (data ? recommendation(data) : []), [data]);

  if (error) return <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</div>;
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-lg bg-surface-muted" />)}
      </div>
    );
  }

  const positive = data.comparison.verdict !== "below";
  const respondedWidth = Math.min(100, Math.round(data.analytics.responseRate * 100));
  const interviewWidth = Math.min(100, Math.round(data.analytics.interviewRate * 100));
  const offerWidth = data.analytics.totalApplied > 0 ? Math.min(100, Math.round((data.analytics.totalOffers / data.analytics.totalApplied) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Send} label="Applications sent" value={String(data.analytics.totalApplied)} sub="Total tracked" />
        <Metric icon={positive ? ArrowUpRight : ArrowDownRight} label="Response rate" value={pct(data.analytics.responseRate)} sub={`vs ${pct(data.benchmark.responseRate)} average`} good={positive} />
        <Metric icon={Target} label="Interview rate" value={pct(data.analytics.interviewRate)} sub={`vs ${pct(data.benchmark.interviewRate)} average`} good={data.analytics.interviewRate >= data.benchmark.interviewRate} />
        <Metric icon={Timer} label="Avg. days to response" value={data.analytics.avgDaysToResponse ? data.analytics.avgDaysToResponse.toFixed(1) : "-"} sub={`Benchmark offer cycle ${Math.round(data.benchmark.avgDaysToOffer)}d`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Funnel insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Insight icon={CalendarDays} label="Best day to apply" value={data.analytics.bestDayOfWeek ? `Applications sent on ${data.analytics.bestDayOfWeek}s perform best.` : "Not enough application history yet."} />
            <Insight icon={Send} label="Strongest platform" value={data.analytics.bestPlatform ? `Your strongest response source is ${data.analytics.bestPlatform}.` : "No platform pattern yet."} />
            <Stage label="Applied" width={100} value={data.analytics.totalApplied} />
            <Stage label="Responded" width={respondedWidth} value={data.analytics.totalResponses} />
            <Stage label="Interview" width={interviewWidth} value={data.analytics.totalInterviews} />
            <Stage label="Offer" width={offerWidth} value={data.analytics.totalOffers} />
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((item) => (
              <div key={item} className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted-foreground">
                {item}
              </div>
            ))}
            <Badge variant={data.comparison.verdict === "above" ? "success" : data.comparison.verdict === "below" ? "warning" : "primary"}>
              {data.comparison.verdict === "above" ? "Above benchmark" : data.comparison.verdict === "below" ? "Below benchmark" : "At benchmark"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, good = true }: { icon: React.ElementType; label: string; value: string; sub: string; good?: boolean }) {
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <Icon className={good ? "h-5 w-5 text-success" : "h-5 w-5 text-warning"} />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Insight({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-surface p-4">
      <Icon className="mt-0.5 h-4 w-4 text-accent" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function Stage({ label, width, value }: { label: string; width: number; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
