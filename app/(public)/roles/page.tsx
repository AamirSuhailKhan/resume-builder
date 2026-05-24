import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ROLE_MAPS } from "./data";
import { ArrowRight, Flame, Shield, TrendingUp, Briefcase, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "India Tech Salary Guide 2026 | CareerOS Market Intelligence",
  description: "High-fidelity salary bands, interview loop splits, DSA vs system design weightage, and recruitment process metrics across India's top-tier product startups.",
  alternates: {
    canonical: "/roles",
  },
  openGraph: {
    title: "India Tech Salary Guide 2026 | CareerOS Market Intelligence",
    description: "High-fidelity salary bands, interview loop splits, DSA vs system design weightage, and recruitment process metrics across India's top-tier product startups.",
    url: "/roles",
    type: "website",
    locale: "en_IN",
  },
};

interface SearchParams {
  category?: string;
}

export default function RolesIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const activeCategory = searchParams.category || "All";

  // Filter maps based on dynamic query parameters
  const filteredRoles = Object.values(ROLE_MAPS).filter((role) => {
    if (activeCategory === "All") return true;
    return role.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const categories = ["All", "Engineering", "Product", "Data", "Management"];

  return (
    <main className="min-h-screen bg-[#08090b] text-[#f6f7f9] font-sans antialiased selection:bg-violet-900 selection:text-white pb-24">
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 space-y-12">
        
        {/* HERO TITLE HEADER */}
        <header className="border-b border-zinc-850 pb-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
            <span>CareerOS Intelligence Feed</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              May 2026 Updates Active
            </span>
          </div>

          {/* Target SEO Query H1 */}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white leading-tight">
            India Tech Salary Guide 2026
          </h1>

          <p className="text-sm leading-relaxed text-zinc-400 max-w-3xl font-mono">
            A verified, high-density catalog comparing real compensation structures, technical DSA loops, and system design expectations across leading product engineering orgs in Bangalore.
          </p>
        </header>

        {/* PERSPECTIVE FILTER CATEGORIES */}
        <div className="space-y-4">
          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">
            Filter by Segment
          </span>
          <div className="flex flex-wrap gap-2 border-b border-zinc-800/60 pb-5">
            {categories.map((cat) => {
              const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
              const url = cat === "All" ? "/roles" : `/roles?category=${cat}`;

              return (
                <Link
                  key={cat}
                  href={url}
                  className={`px-4 py-2 text-xs font-mono font-bold border transition-all ${
                    isActive
                      ? "border-violet-500 bg-violet-950/20 text-violet-400"
                      : "border-zinc-800 bg-[#0e1117] text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {cat.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>

        {/* GRID OF ROLE MAP CARDS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
            <span>Showing {filteredRoles.length} matching maps</span>
            <span>All values verified against offer inputs</span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {filteredRoles.map((role) => (
              <Link 
                key={role.slug}
                href={`/roles/${role.slug}`}
                className="border border-zinc-850 bg-[#0e1117] p-6 rounded-lg hover:border-zinc-700 hover:bg-zinc-800/10 transition-all flex flex-col justify-between group shadow-md text-left"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="bg-zinc-900 border border-zinc-800 text-[9px] px-2 py-0.5 text-zinc-400 font-bold uppercase tracking-wider rounded font-mono">
                      {role.category}
                    </span>
                    <span className="text-zinc-500 font-mono text-xs flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      {role.demandScore}% Demand
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white group-hover:text-violet-400 transition-colors font-mono">
                      {role.title.replace(" Cross-Company Market Map", "")}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-zinc-400 font-mono line-clamp-2">
                      {role.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between font-mono text-xs">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 uppercase">Median Band</span>
                    <span className="text-emerald-400 font-bold">{role.salaryRange}</span>
                  </div>
                  <span className="text-violet-400 group-hover:translate-x-1.5 transition-transform flex items-center gap-1 font-bold">
                    <span>Access Map</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* SYSTEM INTELLIGENCE CTA BANNER */}
        <section className="border border-dashed border-violet-900/60 bg-violet-950/5 p-6 rounded-lg space-y-4 font-mono">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Cross-Calibration with Compensation Analytics
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            Our market maps link directly to the **CareerOS CTC Decoder** and **Salary Benchmarking Engine**. Use these platforms to deconstruct variable components, calculate ESOP exits, and verify competing offers.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold">
            <Link 
              href="/salary-intelligence" 
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Access Salary Engine →
            </Link>
            <Link 
              href="/ats" 
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Analyze Resume Compatibility →
            </Link>
          </div>
        </section>

        {/* Verification Footer */}
        <footer className="border-t border-zinc-850 pt-6 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-500">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Encrypted candidates submission network</span>
          </div>
          <span className="text-[10px] text-zinc-600">CareerOS Market Index v2.1</span>
        </footer>

      </div>
    </main>
  );
}
