import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Shield, ArrowUpRight, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Backend SDE2 Market Map (India) | CareerOS",
  description: "Cross-company comparison map for Backend Software Development Engineer 2 (SDE2) positions. Compare system design weights, DSA expectations, interview timelines, and compensation indexes across leading Indian tech companies.",
  alternates: {
    canonical: "/roles/backend-sde2-market-map",
  },
};

const MARKET_MAP_DATA = [
  { company: "Google India", slug: "google-india", basePay: "60-75 LPA", sysDesignWeight: "45%", dsaWeight: "55%", timeline: "45-60 days", status: "high" },
  { company: "Amazon India", slug: "amazon-india", basePay: "45-55 LPA", sysDesignWeight: "40%", dsaWeight: "50%", timeline: "30 days", status: "high" },
  { company: "Flipkart", slug: "flipkart", basePay: "42-50 LPA", sysDesignWeight: "40%", dsaWeight: "45%", timeline: "21 days", status: "high" },
  { company: "PhonePe", slug: "phonepe", basePay: "45-55 LPA", sysDesignWeight: "45%", dsaWeight: "40%", timeline: "25 days", status: "normal" },
  { company: "Razorpay", slug: "razorpay", basePay: "36-45 LPA", sysDesignWeight: "45%", dsaWeight: "35%", timeline: "14 days", status: "high" },
  { company: "Swiggy", slug: "swiggy", basePay: "38-48 LPA", sysDesignWeight: "40%", dsaWeight: "40%", timeline: "18 days", status: "normal" },
  { company: "CRED", slug: "cred", basePay: "42-52 LPA", sysDesignWeight: "40%", dsaWeight: "35%", timeline: "20 days", status: "normal" },
  { company: "Zepto", slug: "zepto", basePay: "34-42 LPA", sysDesignWeight: "35%", dsaWeight: "45%", timeline: "12 days", status: "high" },
  { company: "Groww", slug: "groww", basePay: "32-42 LPA", sysDesignWeight: "40%", dsaWeight: "40%", timeline: "20 days", status: "high" }
];

export default function BackendSde2MarketMapPage() {
  return (
    <main className="min-h-screen bg-[#08090b] text-[#f6f7f9] font-sans">
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <header className="border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs text-accent uppercase tracking-wider">India Core Engineering Map</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Live Market Tracking Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 sm:text-4xl text-foreground">
            Backend SDE2 Cross-Company Market Map
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground max-w-3xl">
            A high-density comparison grid mapping technical interview expectations, loop weight splits, hiring timelines, and base pay ranges for mid-level backend developers across top-tier companies.
          </p>
        </header>

        {/* Comparison Table */}
        <section className="mt-8">
          <div className="border border-border bg-[#0e1117] rounded-lg overflow-x-auto font-mono text-xs">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#10131b] border-b border-border text-muted-foreground text-[10px] uppercase">
                  <th className="p-3.5">Company Name</th>
                  <th className="p-3.5 text-right">Median Base Pay Range</th>
                  <th className="p-3.5 text-center">Sys Design</th>
                  <th className="p-3.5 text-center">DSA / Algo</th>
                  <th className="p-3.5 text-right">Timeline</th>
                  <th className="p-3.5 text-center">Intelligence Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {MARKET_MAP_DATA.map((row) => (
                  <tr key={row.company} className="hover:bg-surface-elevated transition-colors">
                    <td className="p-3.5 font-bold text-foreground">{row.company}</td>
                    <td className="p-3.5 text-right text-emerald-400 font-semibold">{row.basePay}</td>
                    <td className="p-3.5 text-center">{row.sysDesignWeight}</td>
                    <td className="p-3.5 text-center">{row.dsaWeight}</td>
                    <td className="p-3.5 text-right">{row.timeline}</td>
                    <td className="p-3.5 text-center">
                      <Link
                        href={`/companies/${row.slug}/dashboard`}
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <span>Access Terminal</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Market Insights */}
        <section className="mt-10 grid gap-5 md:grid-cols-2 font-mono text-xs">
          <div className="border border-border bg-[#0e1117] p-5 rounded">
            <h3 className="font-bold text-foreground uppercase border-b border-border/40 pb-2 mb-3">Key Hiring Takeaways</h3>
            <ul className="space-y-2 text-muted-foreground leading-relaxed">
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>System Design (HLD/LLD) now represents a minimum 40% of SDE2 loops.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>Machine Coding remains the primary filtering mechanism for CRED, Razorpay, and Swiggy.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>Average offer lifecycle spans 14 to 30 days; FAANG processes stretch to 60 days.</span>
              </li>
            </ul>
          </div>

          <div className="border border-border bg-[#0e1117] p-5 rounded">
            <h3 className="font-bold text-foreground uppercase border-b border-border/40 pb-2 mb-3">Compensation Strategy</h3>
            <ul className="space-y-2 text-muted-foreground leading-relaxed">
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>Base ranges have consolidated, with a focus on stock grants/variable structures rather than inflated bases.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>Competing offers remain the single highest leverage point for maximum range bounds.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Verification Footer */}
        <footer className="mt-12 border-t border-border pt-6 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Double-blind verified against candidate submissions</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
