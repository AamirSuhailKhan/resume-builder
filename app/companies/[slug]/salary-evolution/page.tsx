import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDashboardService } from "@/lib/services/company-dashboard.service";
import { Clock, Shield, ArrowLeft, ArrowUpRight, TrendingUp } from "lucide-react";

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
  const title = `${companyName} Salary Evolution & Compensation Trends | CareerOS`;
  return {
    title,
    description: `Track salary evolution and compensation adjustments at ${companyName}. Track base pay metrics, inflation trends, and role payouts.`,
    alternates: {
      canonical: `/companies/${slug}/salary-evolution`,
    },
  };
}

export default async function SalaryEvolutionPage({ params }: PageProps) {
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
            <span className="font-mono text-xs text-accent uppercase tracking-wider">Salary Audit Engine</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Latest Aggregations Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 sm:text-4xl text-foreground">
            {data.company.name} Salary Evolution & Comp Ranges
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground max-w-3xl">
            Verified base pay salaries, equity grants, and negotiation margins extracted from candidate-offered CTC contracts for top software developer roles in India.
          </p>
        </header>

        {/* Roles Pay Index */}
        <section className="mt-8">
          <h2 className="text-sm font-bold text-foreground font-mono uppercase tracking-tight mb-4">Engineering Role Compensation Index</h2>
          <div className="border border-border bg-[#0e1117] rounded overflow-hidden font-mono text-xs">
            <div className="grid grid-cols-3 bg-[#10131b] border-b border-border p-3 text-muted-foreground text-[10px] uppercase">
              <span>Role Title</span>
              <span className="text-right">Median Base Pay</span>
              <span className="text-right">Comp Trend</span>
            </div>
            <div className="divide-y divide-border/60">
              {data.roles.map((r) => (
                <div key={r.normalizedRole} className="grid grid-cols-3 p-3 hover:bg-surface-elevated transition-colors">
                  <span className="font-bold text-foreground">{r.role}</span>
                  <span className="text-right text-emerald-400 font-bold">{r.medianBaseLpa} LPA</span>
                  <span className="text-right uppercase text-muted-foreground">{r.compTrend}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Salary Evolution */}
        <section className="mt-10">
          <h2 className="text-sm font-bold text-foreground font-mono uppercase tracking-tight mb-4">Quarterly Salary Compression Timeline</h2>
          <div className="border border-border bg-[#0e1117] p-5 rounded font-mono text-xs space-y-4">
            {data.timeline.map((node) => (
              <div key={node.quarter} className="flex items-center justify-between border-b border-border/30 pb-2.5 last:border-0 last:pb-0">
                <div>
                  <span className="font-bold text-foreground text-sm">{node.quarter}</span>
                  {node.eventMarker && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[9px] font-bold">
                      {node.eventMarker.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">SDE2 Base Median:</span>
                  <span className="font-bold text-emerald-400">{node.medianBaseLpa} LPA</span>
                </div>
              </div>
            ))}
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
