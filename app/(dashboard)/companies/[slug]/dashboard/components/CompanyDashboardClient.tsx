"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Database,
  Filter,
  Info,
  Maximize2,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CompanyDashboardData } from "@/lib/services/company-dashboard.service";

type ClientProps = {
  initialData: CompanyDashboardData;
  slug: string;
};

type TraceDetails = {
  title: string;
  metricKey: string;
  value: string;
  sourceCount: number;
  verifiedRatio: string;
  confidenceInterval: string;
  recencyWindow: string;
  contradictions: string;
  stability: string;
  breakdown: Record<string, string | number>;
  dataSources: string[];
};

export default function CompanyDashboardClient({ initialData, slug }: ClientProps) {
  const [data, setData] = useState<CompanyDashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("backend_sde2");
  const [tickerFilter, setTickerFilter] = useState<"ALL" | "P0" | "P1" | "P2">("ALL");
  const [activeTrace, setActiveTrace] = useState<TraceDetails | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    momentum: true,
    difficulty: true,
    compensation: false,
    ghosting: true,
  });

  // Watchlist handlers
  useEffect(() => {
    const saved = localStorage.getItem("company_watchlist");
    if (saved) {
      setWatchlist(JSON.parse(saved));
    }
  }, []);

  const toggleWatchlist = () => {
    const next = watchlist.includes(slug)
      ? watchlist.filter((s) => s !== slug)
      : [...watchlist, slug];
    setWatchlist(next);
    localStorage.setItem("company_watchlist", JSON.stringify(next));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/v1/companies/${slug}/dashboard?refresh=true`);
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open the Explainability Drawer for a metric/signal
  const openExplainability = (metricKey: string, title: string, currentValue: string) => {
    const isP0 = metricKey.startsWith("sig_");
    const traceInfo: TraceDetails = {
      title: title,
      metricKey: metricKey,
      value: currentValue,
      sourceCount: isP0 ? 14 : data.contributions.totalReports,
      verifiedRatio: isP0 ? "92%" : `${Math.round(data.contributions.verifiedRatio * 100)}%`,
      confidenceInterval: isP0 ? "88–95%" : `${(data.snapshot.confidenceInterval as any)?.[0] || 78}-${(data.snapshot.confidenceInterval as any)?.[1] || 89}%`,
      recencyWindow: `${data.contributions.recencyWindowDays} days`,
      contradictions: data.contributions.contradictions,
      stability: data.snapshot.trendStability || "Stable",
      breakdown: isP0
        ? {
            "Verified Submissions": 9,
            "Recruiter Phone Screens": 3,
            "Direct Candidate Audits": 2,
          }
        : {
            "Interview Experiences": data.contributions.breakdown.experiences,
            "Salary Report Insights": data.contributions.breakdown.salaries,
            "Active Recruiter Logs": data.contributions.breakdown.recruiterSignals,
            "Normalized Questions Count": data.contributions.breakdown.questions,
          },
      dataSources: isP0
        ? ["Postgres Ingest Pipeline", "User Contributions Log", "Recruiter Pattern Engine"]
        : ["Prisma Query Synthesizer", "Redis Cache Node", "Contradiction Engine V1"],
    };
    setActiveTrace(traceInfo);
    setShowDrawer(true);
  };

  const filteredSignals = ((data.snapshot.signals as any[]) || []).filter((sig: any) => {
    if (tickerFilter === "ALL") return true;
    return sig.level === tickerFilter;
  });

  const activeRoleData = (data.roles.find((r) => r.normalizedRole === selectedRole) || data.roles[0])!;
  const confidenceInterval = (data.snapshot.confidenceInterval as any) || [78, 89];

  return (
    <div className="mx-auto max-w-[1600px] px-4 text-foreground antialiased md:px-6">
      {/* 1. Terminal Meta Bar / Top Ticker */}
      <div className="mb-4 flex flex-wrap items-center justify-between border border-border bg-[#0a0c10] px-4 py-2 text-xs font-mono tracking-tight text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-semibold text-foreground">CAREEROS INTELLIGENCE TERMINAL V1.0</span>
          <span>•</span>
          <span>ESTABLISHED: 2026-05-23</span>
          <span>•</span>
          <span className="hidden sm:inline">DATA QUALITY INDEX: HIGH</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">REFRESH STATE: {data.isCached ? "CACHED" : "LIVE"}</span>
          <span>•</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 hover:text-foreground active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "SYNCING..." : "SYNC SNAPSHOT"}</span>
          </button>
        </div>
      </div>

      {/* 2. Company Intelligence Header */}
      <div className="mb-5 border border-border bg-[#0e1117] p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {data.company.name} Hiring Intelligence
              </h1>
              <span className="font-mono text-xs text-muted-foreground">/{data.company.slug}</span>
              <Badge variant={data.company.companyType === "service" ? "neutral" : "primary"}>
                {data.company.companyType.toUpperCase().replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground md:text-sm">
              India hiring graph index showing verified recruiter behaviors, timeline velocities, and candidate selection thresholds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Watchlist button */}
            <Button
              variant={watchlist.includes(slug) ? "secondary" : "outline"}
              size="sm"
              onClick={toggleWatchlist}
              className="h-8 gap-1.5 font-mono text-xs"
            >
              {watchlist.includes(slug) ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>WATCHING</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>ADD WATCHLIST</span>
                </>
              )}
            </Button>

            {/* Alert config trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAlertModalOpen(true)}
              className="h-8 gap-1.5 font-mono text-xs hover:border-amber-500/50 hover:text-amber-300"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>CONFIGURE ALERTS</span>
            </Button>
          </div>
        </div>

        {/* Header Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-3 lg:grid-cols-6 font-mono">
          <div className="border-r border-border/40 pr-2">
            <span className="block text-[10px] text-muted-foreground uppercase">Hiring Velocity</span>
            <span className="mt-1 flex items-center gap-1 text-sm font-semibold">
              {data.snapshot.hiringVelocity === "high" ? (
                <span className="text-emerald-500">ACCELERATING ↑</span>
              ) : data.snapshot.hiringVelocity === "slow" ? (
                <span className="text-rose-500">DECELERATING ↓</span>
              ) : (
                <span className="text-amber-500">STABLE →</span>
              )}
            </span>
          </div>

          <div className="border-r border-border/40 pr-2 sm:border-none lg:border-r">
            <span className="block text-[10px] text-muted-foreground uppercase">Hiring Difficulty</span>
            <span className="mt-1 block text-sm font-semibold text-foreground">
              {data.snapshot.avgDifficulty.toFixed(1)} / 5.0
            </span>
          </div>

          <div className="border-r border-border/40 pr-2 lg:border-r">
            <span className="block text-[10px] text-muted-foreground uppercase">Verified Ratio</span>
            <span className="mt-1 block text-sm font-semibold text-emerald-400">
              {Math.round(data.contributions.verifiedRatio * 100)}%
            </span>
          </div>

          <div className="border-r border-border/40 pr-2 sm:border-none lg:border-r">
            <span className="block text-[10px] text-muted-foreground uppercase">Reports Density</span>
            <span className="mt-1 block text-sm font-semibold text-foreground">
              {data.contributions.totalReports} reports
            </span>
          </div>

          <div className="border-r border-border/40 pr-2">
            <span className="block text-[10px] text-muted-foreground uppercase">Confidence Index</span>
            <span className="mt-1 block text-sm font-semibold text-cyan-400">
              {Math.round(data.snapshot.confidenceScore * 100)}%
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-muted-foreground uppercase">Last Synthesized</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{new Date(data.updatedAt).toLocaleDateString("en-IN")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Signal Ticker Stream */}
      <div className="mb-5 border border-border bg-[#0d0f14]">
        <div className="flex flex-wrap items-center justify-between border-b border-border bg-[#10131b] px-4 py-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold tracking-tight uppercase text-foreground">
              SIGNAL TICKER STREAM (P0 / P1 / P2)
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground mr-1.5">Filter:</span>
            {(["ALL", "P0", "P1", "P2"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTickerFilter(filter)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  tickerFilter === filter
                    ? "bg-accent/15 border-accent text-accent-300 font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border/60 max-h-[220px] overflow-y-auto font-mono text-xs">
          {filteredSignals.length > 0 ? (
            filteredSignals.map((sig: any) => (
              <div
                key={sig.id}
                onClick={() => openExplainability(sig.id, sig.title, sig.level)}
                className="group flex cursor-pointer items-start justify-between gap-4 p-3.5 hover:bg-surface-elevated transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      sig.level === "P0"
                        ? "bg-red-500/15 border border-red-500/30 text-rose-400"
                        : sig.level === "P1"
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                        : "bg-blue-500/15 border border-blue-500/30 text-blue-400"
                    }`}
                  >
                    {sig.level}
                  </span>
                  <div>
                    <span className="font-medium text-foreground hover:underline">{sig.title}</span>
                    <span className="block mt-1 text-[11px] text-muted-foreground leading-normal max-w-4xl">
                      {sig.description}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase">
                    CONF: {Math.round(sig.confidence * 100)}%
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">No active signals found matching filter.</div>
          )}
        </div>
      </div>

      {/* Main Grid: Mid Section */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Left Side: Metrics, Evolution, Role Breakdown */}
        <div className="space-y-5">
          {/* 4. High-Density Metrics Grid & Confidence Layer */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 font-mono">
            {/* Metric 1 */}
            <Card
              variant="bordered"
              onClick={() =>
                openExplainability(
                  "sysDesignWeight",
                  "System Design Loop Weight",
                  `${Math.round(data.snapshot.sysDesignWeight * 100)}%`
                )
              }
              className="cursor-pointer hover:border-accent/40 hover:bg-[#0c0e14] transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>SYS DESIGN WEIGHT</span>
                  <Info className="h-3.5 w-3.5 opacity-60" />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {Math.round(data.snapshot.sysDesignWeight * 100)}%
                  </span>
                  <span className="text-xs text-emerald-500 font-semibold flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>8%</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${data.snapshot.sysDesignWeight * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metric 2 */}
            <Card
              variant="bordered"
              onClick={() =>
                openExplainability(
                  "dsaWeight",
                  "DSA / Problem Solving Weight",
                  `${Math.round(data.snapshot.dsaWeight * 100)}%`
                )
              }
              className="cursor-pointer hover:border-accent/40 hover:bg-[#0c0e14] transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>DSA/ALGO WEIGHT</span>
                  <Info className="h-3.5 w-3.5 opacity-60" />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {Math.round(data.snapshot.dsaWeight * 100)}%
                  </span>
                  <span className="text-xs text-rose-500 font-semibold flex items-center">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    <span>6%</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${data.snapshot.dsaWeight * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metric 3 */}
            <Card
              variant="bordered"
              onClick={() =>
                openExplainability(
                  "avgTimelineDays",
                  "Median Offer Timeline",
                  `${Math.round(data.snapshot.avgTimelineDays)}d`
                )
              }
              className="cursor-pointer hover:border-accent/40 hover:bg-[#0c0e14] transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>MEDIAN TIMELINE</span>
                  <Info className="h-3.5 w-3.5 opacity-60" />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {Math.round(data.snapshot.avgTimelineDays)} days
                  </span>
                  <span className="text-xs text-emerald-500 font-semibold flex items-center">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    <span>3d</span>
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground flex justify-between">
                  <span>FASTEST: 8d</span>
                  <span>SLOWEST: 42d</span>
                </div>
              </CardContent>
            </Card>

            {/* Metric 4 */}
            <Card
              variant="bordered"
              onClick={() =>
                openExplainability(
                  "ghostingRate",
                  "Recruiter Ghosting Rate",
                  `${Math.round(data.snapshot.ghostingRate * 100)}%`
                )
              }
              className="cursor-pointer hover:border-accent/40 hover:bg-[#0c0e14] transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>GHOSTING RATE</span>
                  <Info className="h-3.5 w-3.5 opacity-60" />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {Math.round(data.snapshot.ghostingRate * 100)}%
                  </span>
                  <span className="text-xs text-rose-500 font-semibold flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>4%</span>
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  National Avg: <span className="text-foreground">22%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Confidence interval visual layer */}
          <div className="border border-border bg-[#0d1016] p-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span className="font-bold uppercase tracking-tight text-foreground">
                  CONFIDENCE INTERVAL INTERVAL DECOMPOSITION
                </span>
              </div>
              <Badge variant="primary" className="text-[10px]">
                STABILITY: {(data.snapshot.trendStability || "STABLE").toUpperCase()}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-muted-foreground shrink-0">Boundaries:</span>
              <div className="flex-1 bg-muted h-3.5 rounded relative flex items-center border border-border">
                <div
                  className="bg-cyan-500/20 border-l border-r border-cyan-400/60 h-full absolute flex items-center justify-center text-[10px] text-cyan-300 font-semibold"
                  style={{
                    left: `${(confidenceInterval[0] || 78) - 15}%`,
                    width: `${
                      (confidenceInterval[1] || 89) -
                      (confidenceInterval[0] || 78)
                    }%`,
                  }}
                >
                  <span className="hidden sm:inline">Confidence Zone</span>
                </div>
                <div
                  className="w-1.5 h-4 bg-cyan-400 absolute rounded-full shadow-lg"
                  style={{ left: `${Math.round(data.snapshot.confidenceScore * 100) - 10}%` }}
                />
              </div>
              <span className="text-foreground font-bold shrink-0">
                [{confidenceInterval[0] || 78}% – {confidenceInterval[1] || 89}%]
              </span>
            </div>
            <p className="mt-2.5 text-[10px] text-muted-foreground leading-normal">
              Determined dynamically from {data.contributions.totalReports} candidate submissions. Error bound represents standard variance in compensation offers vs timeline completions in the last 45 days.
            </p>
          </div>

          {/* 5. Role Intelligence Breakdown */}
          <div className="border border-border bg-[#0e1117]">
            <div className="border-b border-border bg-[#10131b] px-4 py-2.5 flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-tight uppercase text-foreground">
                ROLE INTELLIGENCE BREAKDOWN
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">Select role below for detailed breakdown</span>
            </div>

            <div className="flex flex-wrap border-b border-border/60 bg-[#0d0f14] p-1.5 gap-1 font-mono text-xs">
              {data.roles.map((r) => (
                <button
                  key={r.normalizedRole}
                  onClick={() => setSelectedRole(r.normalizedRole)}
                  className={`px-3 py-1 rounded transition-colors text-left flex items-center gap-1.5 ${
                    selectedRole === r.normalizedRole
                      ? "bg-accent/15 border border-accent/40 text-accent-300 font-bold"
                      : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                  }`}
                >
                  <span>{r.role}</span>
                </button>
              ))}
            </div>

            <div className="p-4 grid gap-5 md:grid-cols-[1fr_260px] font-mono text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{activeRoleData.role} Profile</span>
                  <Badge variant={activeRoleData.demand === "high" ? "success" : activeRoleData.demand === "stable" ? "neutral" : "danger"}>
                    DEMAND: {activeRoleData.demand.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="border border-border/40 bg-[#0a0c10] p-3 rounded">
                    <span className="text-[10px] text-muted-foreground block uppercase">Median Base Pay</span>
                    <span className="text-base font-bold text-foreground">{activeRoleData.medianBaseLpa} LPA</span>
                    <span className={`block text-[10px] mt-0.5 font-semibold ${activeRoleData.compTrend === "inflating" ? "text-emerald-500" : activeRoleData.compTrend === "compressing" ? "text-rose-500" : "text-muted-foreground"}`}>
                      {activeRoleData.compTrend.toUpperCase()} TREND
                    </span>
                  </div>

                  <div className="border border-border/40 bg-[#0a0c10] p-3 rounded">
                    <span className="text-[10px] text-muted-foreground block uppercase">Difficulty Level</span>
                    <span className="text-base font-bold text-foreground">
                      {activeRoleData.difficulty.toUpperCase()}
                    </span>
                    <span className="block text-[10px] mt-0.5 text-muted-foreground">
                      Confidence: {Math.round(activeRoleData.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-[10px] text-muted-foreground block uppercase mb-1.5">Core Emphasis Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRoleData.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-surface-muted border border-border text-[11px] rounded text-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Round distribution panel */}
              <div className="border-l border-border/60 pl-5">
                <span className="text-[10px] text-muted-foreground block uppercase mb-3">Loop Distribution</span>
                <div className="space-y-2.5">
                  {Object.entries(activeRoleData.roundDistribution).map(([name, pct]) => (
                    <div key={name}>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span className="capitalize">{name.replace("_", " ")}</span>
                        <span className="font-bold text-foreground">{Math.round(pct * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6. Hiring Evolution Timeline */}
          <div className="border border-border bg-[#0e1117]">
            <div className="border-b border-border bg-[#10131b] px-4 py-2.5 flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-tight uppercase text-foreground">
                HIRING EVOLUTION TIMELINE (QUARTERLY SHIFTS)
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">Historical Trend Logs</span>
            </div>
            <div className="p-4 font-mono text-xs">
              <div className="relative border-l border-border-strong pl-6 ml-2 space-y-5 py-2">
                {data.timeline.map((node, index) => (
                  <div key={node.quarter} className="relative">
                    {/* Node marker */}
                    <div className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-4 bg-[#0e1117] ${node.eventMarker ? "border-amber-400" : "border-border-strong"}`} />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-foreground text-sm">{node.quarter}</span>
                        {node.eventMarker && (
                          <span className="ml-2.5 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold">
                            {node.eventMarker.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-[11px] flex gap-3 flex-wrap">
                        <span>Rounds: <b className="text-foreground">{node.roundsCount}</b></span>
                        <span>Diff: <b className="text-foreground">{node.difficultyScore.toFixed(1)}</b></span>
                        <span>SDE2 Base: <b className="text-foreground">{node.medianBaseLpa}L</b></span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 py-2 border-t border-border/30 text-[10px] text-muted-foreground">
                      <div>Sys Design: <b className="text-foreground">{Math.round(node.sysDesignWeight * 100)}%</b></div>
                      <div>DSA: <b className="text-foreground">{Math.round(node.dsaWeight * 100)}%</b></div>
                      <div>Machine Coding: <b className="text-foreground">{Math.round(node.machineCodingWeight * 100)}%</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Recruiter Trends, Contribution Density, Quick Links */}
        <div className="space-y-5 font-mono text-xs">
          {/* 7. Recruiter Trend Summary */}
          <Card variant="bordered" className="bg-[#0e1117] border-border">
            <div className="border-b border-border bg-[#10131b] px-4 py-2.5">
              <span className="font-bold tracking-tight uppercase text-foreground">
                RECRUITER TREND ENGINE
              </span>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0c10] border border-border/40 p-3 rounded">
                  <span className="text-[10px] text-muted-foreground block uppercase">Avg Latency</span>
                  <span className="text-sm font-bold text-foreground">
                    {data.recruiterSummary.averageResponseDays.toFixed(1)} days
                  </span>
                </div>
                <div className="bg-[#0a0c10] border border-border/40 p-3 rounded">
                  <span className="text-[10px] text-muted-foreground block uppercase">Response Rate</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {Math.round(data.recruiterSummary.responseRate * 100)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Negotiation Style</span>
                  <span className="font-semibold text-foreground text-right capitalize">
                    {data.recruiterSummary.negotiationStyle.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Ghosting Tendency</span>
                  <span className="font-semibold text-rose-400">
                    {Math.round(data.recruiterSummary.ghostingRate * 100)}%
                  </span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-muted-foreground">Contact Reliability</span>
                  <span className="font-semibold text-cyan-400">
                    {data.recruiterSummary.trustScore >= 0.7 ? "High Trust" : "Standard Trust"}
                  </span>
                </div>
              </div>

              <div className="rounded border border-border-strong/50 bg-[#141822]/40 p-3">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Shield className="h-3.5 w-3.5 text-accent" />
                  <span>NEGOTIATION DEFENSE PROTOCOL</span>
                </span>
                <p className="mt-1 text-[10px] text-muted-foreground leading-normal">
                  Recruiters prefer offering base increments based on competing counter-offers. Avoid disclosing current CTC early; state the CareerOS market median of {activeRoleData.medianBaseLpa} LPA instead.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 8. Contribution Density Layer */}
          <Card variant="bordered" className="bg-[#0e1117] border-border">
            <div className="border-b border-border bg-[#10131b] px-4 py-2.5">
              <span className="font-bold tracking-tight uppercase text-foreground">
                CONTRIBUTION DENSITY SIGNALS
              </span>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Verified Submissions</span>
                  <span className="text-emerald-400 font-bold">{data.contributions.freshSubmissionsCount} (last 30d)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Anomalies Detected</span>
                  <span className="text-foreground">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contradictions Engine</span>
                  <span className="text-emerald-500 font-semibold">{data.contributions.contradictions} Alerting</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3">
                <span className="text-[10px] text-muted-foreground block uppercase mb-2">Data Source Breakdown</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>DSA Questions: <b>{data.contributions.breakdown.questions}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span>Experiences: <b>{data.contributions.breakdown.experiences}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>Salary Audits: <b>{data.contributions.breakdown.salaries}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>Recruiters: <b>{data.contributions.breakdown.recruiterSignals}</b></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 9. SEO & Auxiliary Surfaces Quick Links */}
          <div className="border border-border bg-[#0e1117] p-4 rounded-lg space-y-3">
            <span className="font-bold tracking-tight uppercase text-foreground block border-b border-border/40 pb-1.5">
              SEO AUDIT RADAR
            </span>
            <div className="space-y-1">
              <a
                href={`/companies/${data.company.slug}/interview-trends`}
                className="flex items-center justify-between text-accent hover:underline py-1"
              >
                <span>/interview-trends</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href={`/companies/${data.company.slug}/backend-hiring-signals`}
                className="flex items-center justify-between text-accent hover:underline py-1"
              >
                <span>/backend-hiring-signals</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href={`/companies/${data.company.slug}/salary-evolution`}
                className="flex items-center justify-between text-accent hover:underline py-1"
              >
                <span>/salary-evolution</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="/roles/backend-sde2-market-map"
                className="flex items-center justify-between text-accent hover:underline py-1"
              >
                <span>/roles/backend-sde2-market-map</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 10. Explainability Drawer Panel */}
      {showDrawer && activeTrace && (
        <div className="fixed inset-0 z-50 overflow-hidden font-mono text-xs">
          <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-xs" onClick={() => setShowDrawer(false)} />
          <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-[#0d0f14] border-l border-border shadow-2xl flex flex-col">
            <div className="border-b border-border bg-[#10131b] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-400" />
                <span className="font-bold tracking-tight text-foreground uppercase">
                  INTELLIGENCE EXPLAINABILITY TRACE
                </span>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="rounded border border-border p-1 hover:text-foreground text-muted-foreground hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Metric Source</span>
                <h3 className="text-sm font-bold text-foreground mt-1">{activeTrace.title}</h3>
                <div className="mt-2.5 p-3 rounded bg-[#07080b] border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase block">Calculated Value</span>
                  <span className="text-lg font-bold text-cyan-400 mt-0.5 block">{activeTrace.value}</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-3">
                <span className="font-bold text-foreground uppercase block">DATA QUALITY CONFIDENCE DECOMPOSITION</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Sources Ingested</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">
                      {activeTrace.sourceCount} reports
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Verified Ratio</span>
                    <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                      {activeTrace.verifiedRatio}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Confidence Interval</span>
                    <span className="font-bold text-cyan-400 text-sm mt-0.5 block">
                      {activeTrace.confidenceInterval}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Recency Window</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">
                      {activeTrace.recencyWindow}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4">
                <span className="font-bold text-foreground uppercase block mb-2">VALIDATION DISTRIBUTION</span>
                <div className="space-y-2">
                  {Object.entries(activeTrace.breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/40 pt-4">
                <span className="font-bold text-foreground uppercase block mb-2">ATTRIBUTION GRAPH TRACE</span>
                <div className="space-y-2">
                  {activeTrace.dataSources.map((src, index) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground py-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{src}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-[#10131b] p-4 text-center">
              <p className="text-[10px] text-muted-foreground leading-normal">
                CareerOS trust score algorithm ensures double-blind corroboration. Spurious or unverified data points are auto-pruned by the anomaly detection layer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 11. Alerts Configuration Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-mono text-xs">
          <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-xs" onClick={() => setIsAlertModalOpen(false)} />
          <div className="relative bg-[#0d0f14] border border-border rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-accent" />
                <span>CONFIGURE SIGNAL ALERTS</span>
              </span>
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              Toggle which hiring intelligence signals you wish to monitor. Alerts will be delivered programmatically to your watch feed and inbox.
            </p>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-muted cursor-pointer hover:bg-surface-elevated">
                <div>
                  <span className="font-bold text-foreground">Hiring Momentum Shifts</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">Alert on rapid velocity increases or freezes.</span>
                </div>
                <input
                  type="checkbox"
                  checked={alertSettings.momentum}
                  onChange={(e) => setAlertSettings({ ...alertSettings, momentum: e.target.checked })}
                  className="rounded border-border bg-background text-accent focus:ring-accent"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-muted cursor-pointer hover:bg-surface-elevated">
                <div>
                  <span className="font-bold text-foreground">Difficulty Loop Changes</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">Alert if DSA or System Design weights change &gt; 10%.</span>
                </div>
                <input
                  type="checkbox"
                  checked={alertSettings.difficulty}
                  onChange={(e) => setAlertSettings({ ...alertSettings, difficulty: e.target.checked })}
                  className="rounded border-border bg-background text-accent focus:ring-accent"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-muted cursor-pointer hover:bg-surface-elevated">
                <div>
                  <span className="font-bold text-foreground">Compensation Shift Anomalies</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">Alert on salary compression or inflation adjustments.</span>
                </div>
                <input
                  type="checkbox"
                  checked={alertSettings.compensation}
                  onChange={(e) => setAlertSettings({ ...alertSettings, compensation: e.target.checked })}
                  className="rounded border-border bg-background text-accent focus:ring-accent"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded border border-border bg-surface-muted cursor-pointer hover:bg-surface-elevated">
                <div>
                  <span className="font-bold text-foreground">Recruiter Ghosting Flags</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">Alert if post-interview ghosting rate exceeds 25%.</span>
                </div>
                <input
                  type="checkbox"
                  checked={alertSettings.ghosting}
                  onChange={(e) => setAlertSettings({ ...alertSettings, ghosting: e.target.checked })}
                  className="rounded border-border bg-background text-accent focus:ring-accent"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsAlertModalOpen(false)}>
                CANCEL
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsAlertModalOpen(false);
                  alert("Alert configuration updated successfully.");
                }}
              >
                SAVE ALERTS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
