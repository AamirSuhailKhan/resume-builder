import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Shield, ArrowUpRight, Award, Flame, Star, ChevronRight, Zap } from "lucide-react";
import { ROLE_MAPS } from "../data";
import EmailCaptureBar from "@/components/EmailCaptureBar";

export const dynamic = "force-static";

// Next.js App Router Static Generation
export function generateStaticParams() {
  return Object.keys(ROLE_MAPS).map((slug) => ({
    slug,
  }));
}

// Generate dynamic Metadata for SEO
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const role = ROLE_MAPS[params.slug];
  if (!role) {
    return {
      title: "Role Map Not Found | CareerOS",
    };
  }

  return {
    title: `${role.title} (${role.salaryRange}) | CareerOS`,
    description: role.description,
    alternates: {
      canonical: `/roles/${role.slug}`,
    },
    openGraph: {
      title: `${role.title} (${role.salaryRange})`,
      description: role.description,
      url: `/roles/${role.slug}`,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default function RoleMarketMapPage({ params }: { params: { slug: string } }) {
  const role = ROLE_MAPS[params.slug];

  if (!role) {
    notFound();
  }

  // JSON-LD JobPosting & FAQ Schema for immediate Google Search ranking
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is the salary range for ${role.title} in India for 2026?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Based on verified India market compensation mapping, the average salary band for a ${role.title} is between ${role.salaryRange}. This includes guaranteed base cash, performance variable bonuses, and equity options (ESOPs/RSUs).`
        }
      },
      {
        "@type": "Question",
        "name": `Which companies pay the highest for ${role.title} in Bangalore and India?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `According to our 2026 engineering tracking indices, the highest paying companies for this role include: ${role.companies.slice(0, 3).map(c => `${c.company} (${c.basePay})`).join(", ")}.`
        }
      }
    ]
  };

  const stars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < fullStars ? "fill-amber-400" : "text-zinc-700"}`}
          />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1 font-mono">({rating})</span>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#08090b] text-[#f6f7f9] font-sans antialiased selection:bg-violet-900 selection:text-white pb-24">
      {/* JSON-LD Script Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 space-y-12">
        
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/roles" className="hover:text-violet-400 transition-colors">ROLES</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-300 uppercase">{role.slug.replace(/-/g, " ")}</span>
        </div>

        {/* HEADER SECTION */}
        <header className="border-b border-zinc-800/80 pb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-violet-950/40 border border-violet-800 text-[10px] px-2.5 py-0.5 text-violet-300 font-bold uppercase tracking-wider rounded font-mono">
              {role.category} MARKET MAP
            </span>
            <span className="text-zinc-700">•</span>
            <span className="font-mono text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-violet-400" />
              Live India 2026 Market Data
            </span>
          </div>

          {/* Target SEO Query H1 */}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white leading-tight">
            {role.targetQuery}
          </h1>

          <p className="text-sm leading-relaxed text-zinc-400 max-w-3xl font-mono">
            {role.description}
          </p>

          <div className="pt-2 flex flex-wrap gap-4 items-center">
            <div className="bg-[#0e1117] border border-zinc-800 rounded p-3 flex flex-col min-w-[150px]">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Median CTC Range</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 font-mono">{role.salaryRange}</span>
            </div>
            <div className="bg-[#0e1117] border border-zinc-800 rounded p-3 flex flex-col min-w-[150px]">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Hiring Velocity</span>
              <span className="text-lg font-bold text-white mt-1 flex items-center gap-1.5 font-mono">
                <Flame className="h-4 w-4 text-orange-500" /> {role.demandScore}% Demand
              </span>
            </div>
          </div>
        </header>

        {/* SECTION 1: COMPARE COMPANY CARDS */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-850 pb-3">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2 font-mono">
                <Zap className="h-4 w-4 text-violet-400" /> 1. Company Calibration Matrix
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Verified hiring expectations, interview complexity, and loop metrics.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {role.companies.map((company) => (
              <div 
                key={company.company} 
                className="border border-zinc-800 bg-[#0e1117] p-5 rounded-lg flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md relative group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-violet-600/40 group-hover:bg-violet-500 transition-all" />
                <div className="space-y-3 pl-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm">{company.company}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">Loop difficulty</span>
                  </div>
                  <div>
                    {stars(company.difficulty)}
                  </div>
                  <div className="bg-black/35 p-2.5 rounded border border-zinc-850 font-mono space-y-1.5 mt-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Median Base:</span>
                      <span className="text-emerald-400 font-bold">{company.basePay}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">DSA Rounds:</span>
                      <span className="text-zinc-300 font-bold">{company.rounds.dsa} Rounds</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">System Design:</span>
                      <span className="text-zinc-300 font-bold">{company.rounds.systemDesign} Rounds</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Timeline:</span>
                      <span className="text-zinc-300 font-bold">{company.timeline}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 text-right">
                  <Link
                    href={`/companies/${company.slug}/dashboard`}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-all font-mono"
                  >
                    <span>Intelligence Terminal</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: SALARY TIER ANALYSIS */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2 font-mono">
              <Award className="h-4 w-4 text-violet-400" /> 2. Market Entry Salary Bands
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">How your entry vector affects target base pay offers in 2026.</p>
          </div>

          <div className="border border-zinc-800 bg-[#0e1117] rounded-lg overflow-hidden font-mono text-xs shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#10131b] border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-bold">
                  <th className="p-4">Hiring Entry Channel</th>
                  <th className="p-4 text-right">Estimated 2026 Compensation Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                <tr className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 font-bold text-white">Tier 1 College Placement (IIT/BITS/NIT)</td>
                  <td className="p-4 text-right text-emerald-400 font-bold">{role.tierSalaries.tier1}</td>
                </tr>
                <tr className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 font-bold text-white">Tier 2/3 College Placement</td>
                  <td className="p-4 text-right text-zinc-300 font-bold">{role.tierSalaries.tier2}</td>
                </tr>
                <tr className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 font-bold text-white">Lateral Market Shift (Experience-based)</td>
                  <td className="p-4 text-right text-emerald-400 font-bold">{role.tierSalaries.lateral}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: SKILLS WEIGHTAGE */}
        <section className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="border border-zinc-850 bg-[#0e1117] p-6 rounded-lg space-y-6 flex flex-col justify-between shadow-md">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                3. Interview Loop Skill Weightage
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                Relative percentage weightage assigned to core skill pillars during the evaluation cycle.
              </p>
            </div>

            {/* CSS-only Beautiful Bar Chart */}
            <div className="space-y-4 pt-2">
              {role.skills.map((skill) => (
                <div key={skill.label} className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-300">{skill.label}</span>
                    <span className="text-white">{skill.weight}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${skill.weight}%`, 
                        backgroundColor: skill.color 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FOCUS CARD */}
          <div className="border border-zinc-850 bg-[#0e1117] p-6 rounded-lg flex flex-col justify-between shadow-md font-mono">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Platform Technical Directive
              </h3>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 text-[11px] leading-relaxed text-zinc-300 border-dashed">
                <strong className="text-violet-400 uppercase block mb-1">Architectural Focus:</strong>
                {role.focus}
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                To maximize your callback probabilities above 82%, your resume must feature verifiable outcome metrics mapping to these core technology directives.
              </p>
            </div>
            
            <div className="pt-4 border-t border-zinc-800/60 space-y-2 text-[11px]">
              <Link 
                href="/ats" 
                className="flex items-center justify-between text-zinc-300 hover:text-violet-400 font-bold transition-all"
              >
                <span>Optimize Resume for {role.title} →</span>
                <span className="text-violet-400">ATS Tool</span>
              </Link>
              <Link 
                href="/salary-intelligence" 
                className="flex items-center justify-between text-zinc-300 hover:text-violet-400 font-bold transition-all"
              >
                <span>Decode Comp Structure →</span>
                <span className="text-violet-400">Comp Engine</span>
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 4: PROCESS TIMELINE */}
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2 font-mono">
              <Clock className="h-4 w-4 text-violet-400" /> 4. Verified Loop Timelines
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Recruiter workflow sequences for leading startups.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {role.timeline.map((t) => (
              <div key={t.company} className="border border-zinc-850 bg-[#0e1117] p-5 rounded-lg space-y-4 font-mono shadow-md">
                <span className="text-xs font-bold text-white uppercase border-b border-zinc-800 pb-2 block">
                  {t.company} LOOP SEQUENCE
                </span>
                <div className="space-y-3">
                  {t.steps.map((step, idx) => (
                    <div key={idx} className="text-[11px] text-zinc-400 leading-normal flex items-start gap-2">
                      <span className="text-violet-400 shrink-0 font-bold">▪</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Verification Banner */}
        <footer className="mt-8 border-t border-zinc-800 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-500">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Candidate verified compensation indexes</span>
          </div>

          {/* CTA Link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 bg-violet-600 text-white font-bold px-4 py-2 hover:bg-violet-700 transition-colors shadow-md rounded"
          >
            <span>Track your application with CareerOS free</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>

      {/* Dynamic zero-friction lead capture bar with 5s delay */}
      <EmailCaptureBar
        source="roles-page"
        metadata={{ role: role.slug }}
        delayMs={5000}
      />
    </main>
  );
}
