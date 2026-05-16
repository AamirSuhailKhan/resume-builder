"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Building2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Intelligence = {
  companyName: string;
  healthScore: number;
  hiringVelocity: string;
  glassdoorRating?: number | null;
  recentNews: Array<{ title?: string; summary?: string; sentiment?: string; date?: string; url?: string }>;
  interviewProcess?: { rounds?: number; difficulty?: string; avgDays?: number; format?: string };
  cultureSignals?: { wlb?: number; management?: number; growth?: number };
  layoffRisk: string;
  scamRisk: string;
  scamSignals?: { signals?: string[] };
};

export function CompanyIntelligencePanel({ companyName, companyDomain }: { companyName: string; companyDomain?: string }) {
  const [intel, setIntel] = useState<Intelligence | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/v1/companies/${encodeURIComponent(companyName)}/intelligence${companyDomain ? `?domain=${encodeURIComponent(companyDomain)}` : ""}`;
    setIntel(null);
    fetch(url)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setIntel(payload.intelligence as Intelligence);
      })
      .catch(() => {
        if (!cancelled) setError("Limited public information.");
      });
    return () => {
      cancelled = true;
    };
  }, [companyDomain, companyName]);

  if (error) return <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">{error}</div>;
  if (!intel) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-lg bg-surface-muted" />)}
      </div>
    );
  }

  const scoreColor = intel.healthScore >= 70 ? "text-success" : intel.healthScore >= 40 ? "text-warning" : "text-danger";
  const scamSignals = intel.scamSignals?.signals ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card variant="elevated">
          <CardContent className="p-5 text-center">
            <div className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full border-8 ${intel.healthScore >= 70 ? "border-success/30" : intel.healthScore >= 40 ? "border-warning/30" : "border-danger/30"}`}>
              <span className={`text-4xl font-semibold ${scoreColor}`}>{Math.round(intel.healthScore)}</span>
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">Company health score</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Based on hiring velocity, culture signals, and financial health</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              {intel.companyName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={intel.scamRisk === "safe" ? "success" : intel.scamRisk === "scam" ? "danger" : "warning"}>
                {intel.scamRisk === "safe" ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {intel.scamRisk === "safe" ? "Verified company" : intel.scamRisk === "scam" ? `High scam risk: ${scamSignals.join(", ")}` : "Limited info"}
              </Badge>
              <Badge variant={intel.hiringVelocity === "growing" ? "success" : intel.hiringVelocity === "shrinking" ? "danger" : "neutral"}>
                {intel.hiringVelocity === "shrinking" ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                {intel.hiringVelocity || "unknown"}
              </Badge>
              <Badge>Layoff risk: {intel.layoffRisk}</Badge>
              {intel.glassdoorRating && <Badge>{intel.glassdoorRating}/5 rating</Badge>}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MiniBar label="Work-life balance" value={intel.cultureSignals?.wlb ?? 50} />
              <MiniBar label="Management" value={intel.cultureSignals?.management ?? 50} />
              <MiniBar label="Growth" value={intel.cultureSignals?.growth ?? 50} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader><CardTitle>Recent news</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(intel.recentNews ?? []).slice(0, 3).map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span className={item.sentiment === "positive" ? "h-2 w-2 rounded-full bg-success" : item.sentiment === "negative" ? "h-2 w-2 rounded-full bg-danger" : "h-2 w-2 rounded-full bg-muted-foreground"} />
                  <p className="text-sm font-medium text-foreground">{item.title ?? "Company update"}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary ?? "Limited public information."}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader><CardTitle>Interview process</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Rounds" value={String(intel.interviewProcess?.rounds ?? "Unknown")} />
            <Info label="Difficulty" value={intel.interviewProcess?.difficulty ?? "Unknown"} />
            <Info label="Average timeline" value={intel.interviewProcess?.avgDays ? `${intel.interviewProcess.avgDays} days` : "Unknown"} />
            <Info label="Format" value={intel.interviewProcess?.format ?? "Limited public information"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{Math.round(value)}</span></div>
      <div className="h-2 rounded-full bg-surface-muted"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium text-foreground">{value}</p></div>;
}
