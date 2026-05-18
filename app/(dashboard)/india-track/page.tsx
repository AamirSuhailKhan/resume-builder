"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Flame, Snowflake, Clock, Target, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getTierColor(tier: string) {
  if (tier === "faang_india") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  if (tier === "tier1_india") return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800";
  if (tier === "unicorn") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}

function formatTier(tier: string) {
  if (tier === "faang_india") return "FAANG India";
  if (tier === "tier1_india") return "Tier 1";
  if (tier === "unicorn") return "Unicorn";
  if (tier === "soonicorn") return "Soonicorn";
  return tier;
}

function formatCurrencyLakhs(num: number) {
  return `₹${Math.round(num / 100000)}L`;
}

export default function IndiaTrackPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [tier, setTier] = useState("all");
  const [hiringStatus, setHiringStatus] = useState("all");
  const [dsaDifficulty, setDsaDifficulty] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCompanies() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (tier !== "all") query.set("tier", tier);
        if (hiringStatus !== "all") query.set("hiringStatus", hiringStatus);
        if (dsaDifficulty !== "all") query.set("dsaDifficulty", dsaDifficulty);
        if (search) query.set("search", search);

        const res = await fetch(`/api/v1/india-track?${query.toString()}`);
        const { data } = await res.json();
        setCompanies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [tier, hiringStatus, dsaDifficulty, search]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">Disclaimer:</span> Data sourced from Glassdoor, GeeksForGeeks, and community reports. 
          Company hiring processes and compensation change frequently. Verify before your interview.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Crack top Indian tech companies
        </h1>
        <p className="text-muted-foreground">Interview guides, salary ranges, and prep resources — updated from real candidate experiences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search company..."
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="all">All Tiers</option>
          <option value="faang_india">FAANG India</option>
          <option value="tier1_india">Tier 1</option>
          <option value="unicorn">Unicorn</option>
          <option value="soonicorn">Soonicorn</option>
        </select>
        <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={hiringStatus} onChange={(e) => setHiringStatus(e.target.value)}>
          <option value="all">All Hiring Status</option>
          <option value="high">Actively Hiring</option>
          <option value="normal">Normal</option>
          <option value="frozen">Frozen</option>
        </select>
        <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={dsaDifficulty} onChange={(e) => setDsaDifficulty(e.target.value)}>
          <option value="all">All DSA Difficulties</option>
          <option value="hard">Hard</option>
          <option value="medium">Medium</option>
          <option value="easy">Easy</option>
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading companies...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map((company) => {
            const isHigh = company.hiringStatus === "high";
            const isFrozen = company.hiringStatus === "frozen";

            const sde2Salary = company.salaryRanges?.SDE2
              ? `${formatCurrencyLakhs(company.salaryRanges.SDE2.min)}–${formatCurrencyLakhs(company.salaryRanges.SDE2.max)}`
              : "N/A";

            return (
              <Card key={company.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push(`/india-track/${company.companySlug}`)}>
                <CardContent className="p-6 space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center text-2xl border border-border">
                        {company.logoEmoji}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{company.companyName}</h2>
                        <Badge variant="outline" className={getTierColor(company.tier)}>
                          {formatTier(company.tier)}
                        </Badge>
                      </div>
                    </div>
                    {isHigh && <Badge variant="success" className="flex items-center gap-1"><Flame className="w-3 h-3" /> Actively hiring</Badge>}
                    {isFrozen && <Badge variant="neutral" className="flex items-center gap-1"><Snowflake className="w-3 h-3" /> Frozen</Badge>}
                    {!isHigh && !isFrozen && <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Normal</Badge>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Target className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">DSA</span>
                      <span className="text-sm font-semibold capitalize">{company.dsaDifficulty}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center border-x border-border">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Rounds</span>
                      <span className="text-sm font-semibold">{company.hiringProcess?.totalRounds || 4}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                      <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Timeline</span>
                      <span className="text-sm font-semibold">{company.avgTimelineDays} days</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      <span className="text-muted-foreground">SDE2 Avg: </span>
                      <span className="text-foreground">{sde2Salary}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800 group">
                      Guide <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {companies.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-10 text-center text-muted-foreground">
              No companies match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
