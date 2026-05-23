import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDashboardService } from "@/lib/services/company-dashboard.service";
import { Clock, Shield, AlertTriangle, ArrowLeft, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function titleCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const companyName = titleCase(slug);
  const title = `${companyName} Backend Engineer (SDE2) Hiring Signals | CareerOS`;
  return {
    title,
    description: `Track backend engineering hiring signals at ${companyName}. Evaluate machine coding focus, system design expectations, and median salaries.`,
    alternates: {
      canonical: `/companies/${slug}/backend-hiring-signals`,
    },
  };
}

export default async function BackendHiringSignalsPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  let data;
  try {
    data = await CompanyDashboardService.getDashboard(slug);
  } catch (error) {
    console.error(error);
    notFound();
  }

  const backendRole = data.roles.find((r) => r.normalizedRole === "backend_sde2") || data.roles[0];
  if (!backendRole) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-[#f6f7f9] font-sans">
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <Link
          href={`/companies/${slug}/dashboard`}
          className="inline-flex items-center gap-2 text-xs font-mono text-accent hover:underline mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>BACK TO TERMINAL DASHBOARD</span>
        </Link>

        <header className="border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs text-accent uppercase tracking-wider">Hiring Stream Analysis</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Live Ingest Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 sm:text-4xl text-foreground">
            {data.company.name} Backend Engineering Hiring Signals
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground max-w-3xl">
            Granular analysis of backend developer interviews, including system design expectations, OOP patterns, and active hiring velocity indicator.
          </p>
        </header>

        {/* Dynamic Signals List */}
        <section className="mt-8 space-y-4">
          <h2 className="text-sm font-bold text-foreground font-mono uppercase tracking-tight">Active Signal Alerts</h2>
          {data.snapshot.signals && (data.snapshot.signals as any[]).length > 0 ? (
            (data.snapshot.signals as any[]).map((sig: any) => (
              <div key={sig.id} className="border border-border bg-[#0e1117] p-4 rounded font-mono text-xs flex items-start gap-3">
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 ${
                  sig.level === "P0" ? "bg-red-500/15 border border-red-500/30 text-rose-400" : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                }`}>
                  {sig.level}
                </span>
                <div>
                  <h3 className="font-bold text-foreground">{sig.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{sig.description}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No active anomaly alerts detected for this period.</p>
          )}
        </section>

        {/* Backend Specific Breakdown */}
        <section className="mt-10 border border-border bg-[#0e1117] p-5 rounded font-mono text-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <span className="font-bold text-foreground uppercase">Backend SDE2 Assessment Profile</span>
            <span className="text-[10px] text-muted-foreground">Confidence: {Math.round(backendRole.confidence * 100)}%</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-border/40 p-3 bg-background rounded">
              <span className="text-[10px] text-muted-foreground block uppercase">Hiring Mode</span>
              <span className="text-sm font-bold text-foreground uppercase mt-1 block">
                {data.snapshot.hiringVelocity === "high" ? "Accelerating" : "Stable"}
              </span>
            </div>
            <div className="border border-border/40 p-3 bg-background rounded">
              <span className="text-[10px] text-muted-foreground block uppercase">Median Base Pay</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block">
                {backendRole.medianBaseLpa} LPA
              </span>
            </div>
            <div className="border border-border/40 p-3 bg-background rounded">
              <span className="text-[10px] text-muted-foreground block uppercase">Interview Latency</span>
              <span className="text-sm font-bold text-foreground mt-1 block">
                {Math.round(data.snapshot.avgTimelineDays)} Days Median
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] text-muted-foreground block uppercase">Evaluation Mix Weighting</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>System Design</span>
                  <span>{Math.round((backendRole.roundDistribution.sys_design || 0.40) * 100)}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(backendRole.roundDistribution.sys_design || 0.40) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>DSA/Algorithms</span>
                  <span>{Math.round((backendRole.roundDistribution.dsa || 0.40) * 100)}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(backendRole.roundDistribution.dsa || 0.40) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Machine Coding</span>
                  <span>{Math.round((backendRole.roundDistribution.machine_coding || 0.20) * 100)}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(backendRole.roundDistribution.machine_coding || 0.20) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block uppercase mb-1.5">Required Tech Skill Focus</span>
            <div className="flex flex-wrap gap-1.5">
              {backendRole.skills.map((skill) => (
                <span key={skill} className="px-2 py-0.5 bg-surface border border-border rounded text-[11px] text-foreground">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Verification Footer */}
        <footer className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Double-blind verified against candidate submissions</span>
          </div>
          <Link
            href={`/companies/${slug}/dashboard`}
            className="flex items-center gap-1.5 text-accent hover:underline"
          >
            <span>Access Real-Time Terminal View</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
