"use client";

import { useMemo, useState } from "react";
import patterns from "@/lib/data/hiring-patterns.json";
import { Badge } from "@/components/ui/badge";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
type CompanyType = keyof typeof patterns;

export default function TimingPage() {
  const [companyType, setCompanyType] = useState<CompanyType>("startup_growth");
  const pattern = patterns[companyType];
  const currentMonth = new Date().getMonth() + 1;
  const score = useMemo(() => pattern.bestMonths.includes(currentMonth) ? 92 : pattern.worstMonths.includes(currentMonth) ? 42 : 68, [currentMonth, pattern]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6">
      <div>
        <p className="text-sm font-medium text-accent">Hiring Calendar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">Find the stronger application windows.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Timing advice is supplementary and based on historical patterns. Never hide a strong job because of timing alone.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(patterns).map((type) => (
          <button key={type} onClick={() => setCompanyType(type as CompanyType)} className={companyType === type ? "rounded-lg bg-foreground px-3 py-2 text-sm text-background" : "rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"}>
            {type.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface-elevated p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Your search timing score</p>
            <p className="text-4xl font-semibold text-foreground">{score}</p>
          </div>
          <Badge>{pattern.hiringCyclePeak} peak</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {months.map((month, index) => {
            const monthNum = index + 1;
            const best = pattern.bestMonths.includes(monthNum);
            const worst = pattern.worstMonths.includes(monthNum);
            return (
              <div key={month} className={best ? "rounded-lg border border-success/30 bg-success/10 p-4" : worst ? "rounded-lg border border-border bg-surface-muted p-4 opacity-70" : "rounded-lg border border-border bg-surface p-4"}>
                <p className="font-medium text-foreground">{month}</p>
                <p className="mt-2 text-xs text-muted-foreground">{best ? "Best month" : worst ? "Slower" : "Neutral"}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">{pattern.notes}</p>
      </div>
    </main>
  );
}
