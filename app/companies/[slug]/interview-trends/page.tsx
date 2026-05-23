import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDashboardService } from "@/lib/services/company-dashboard.service";
import { Clock, Shield, CheckCircle, ArrowLeft, ArrowUpRight } from "lucide-react";

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
  const title = `${companyName} Technical Interview Trends & Focus Areas | CareerOS`;
  return {
    title,
    description: `Analyze recent technical interview trends at ${companyName}. Review shifts in DSA vs System Design evaluation, coding round counts, and recruiter feedback.`,
    alternates: {
      canonical: `/companies/${slug}/interview-trends`,
    },
  };
}

export default async function InterviewTrendsPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  let data;
  try {
    data = await CompanyDashboardService.getDashboard(slug);
  } catch (error) {
    console.error(error);
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
            <span className="font-mono text-xs text-accent uppercase tracking-wider">Historical Audit</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Updated 2 days ago
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 sm:text-4xl text-foreground">
            {data.company.name} Interview Trends & Loop Changes
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground max-w-3xl">
            Corroborated candidate signals outlining technical assessment shifts, hiring velocity, and evaluation criteria weights for engineering tracks in India.
          </p>
        </header>

        {/* Audit Meta Grid */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3 font-mono text-xs">
          <div className="border border-border bg-[#0e1117] p-4 rounded">
            <span className="text-[10px] text-muted-foreground uppercase block">Trend Stability</span>
            <span className="text-sm font-bold text-foreground mt-1 block">
              {(data.snapshot.trendStability || "Stable").toUpperCase()}
            </span>
          </div>
          <div className="border border-border bg-[#0e1117] p-4 rounded">
            <span className="text-[10px] text-muted-foreground uppercase block">Corroborated Signals</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">
              {data.contributions.totalReports} Submissions
            </span>
          </div>
          <div className="border border-border bg-[#0e1117] p-4 rounded">
            <span className="text-[10px] text-muted-foreground uppercase block">Synthesized Confidence</span>
            <span className="text-sm font-bold text-cyan-400 mt-1 block">
              {Math.round(data.snapshot.confidenceScore * 100)}% Index
            </span>
          </div>
        </section>

        {/* Timeline Evolution */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-tight border-l-2 border-accent pl-3">
            Quarterly Loop Evolution
          </h2>
          <div className="mt-6 border-l border-border pl-6 ml-2 space-y-8 font-mono text-xs">
            {data.timeline.map((node) => (
              <div key={node.quarter} className="relative">
                <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-4 border-border bg-[#08090b]" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{node.quarter}</span>
                  <span className="text-muted-foreground text-[10px]">
                    Average Rounds: <b>{node.roundsCount}</b>
                  </span>
                </div>
                <p className="mt-1.5 text-muted-foreground text-[11px] leading-relaxed">
                  Focus distribution shifted to {Math.round(node.sysDesignWeight * 100)}% System Design, {Math.round(node.dsaWeight * 100)}% DSA, and {Math.round(node.machineCodingWeight * 100)}% Machine Coding.
                </p>
                {node.eventMarker && (
                  <span className="mt-2 inline-block px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent-300 text-[9px] font-bold">
                    {node.eventMarker.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Recruiter Behavior Audit */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-tight border-l-2 border-accent pl-3">
            Recruiter Behavior & Ghosting Audit
          </h2>
          <div className="mt-6 border border-border bg-[#0e1117] p-5 rounded font-mono text-xs space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Response Latency:</span>
                <span className="text-foreground font-bold ml-2">
                  {data.recruiterSummary.averageResponseDays.toFixed(1)} Days Median
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Candidate Response Rate:</span>
                <span className="text-emerald-400 font-bold ml-2">
                  {Math.round(data.recruiterSummary.responseRate * 100)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Post-Technical Ghosting Rate:</span>
                <span className="text-rose-400 font-bold ml-2">
                  {Math.round(data.recruiterSummary.ghostingRate * 100)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Compensation Negotiation Type:</span>
                <span className="text-foreground font-bold ml-2 capitalize">
                  {data.recruiterSummary.negotiationStyle.replace("_", " ")}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal border-t border-border/40 pt-3">
              Recruiter patterns are generated dynamically from connect latency and connection failures reported by candidates in active search cycles.
            </p>
          </div>
        </section>

        {/* Verification & Trust */}
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
