"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { CareerGraph, GraphNode, GraphNodeKind, GraphSummary, CareerGraphAnalytics } from "@/lib/career-graph/types";
import { NodeDetailPanel, GraphLegend, GraphStatsBar } from "./GraphControls";
import { GraphGapPanel, type GapAnalysis } from "./GraphGapPanel";
import { GraphAnalyticsPanel } from "./GraphAnalyticsPanel";
import { GitBranch, BarChart3, Search, RefreshCw, Cpu } from "lucide-react";

const CareerGraphCanvas = dynamic(
  () => import("./CareerGraphCanvas").then((m) => m.CareerGraphCanvas),
  { ssr: false, loading: () => <div className="h-[580px] flex items-center justify-center text-slate-500 text-sm">Initialising graph…</div> }
);

type Tab = "graph" | "analytics" | "gaps";
type LoadState = "idle" | "loading" | "success" | "error";

const ALL_KINDS: GraphNodeKind[] = [
  "SKILL","EXPERIENCE","PROJECT","CERTIFICATION","EDUCATION",
  "APPLICATION","INTERVIEW","COMPANY","RECRUITER","CAREER_GOAL",
  "SALARY_TARGET","JOB_MATCH","SKILL_GAP","OFFER",
];

export function CareerGraphPage() {
  const [tab, setTab] = useState<Tab>("graph");
  const [graph, setGraph] = useState<CareerGraph | null>(null);
  const [summary, setSummary] = useState<GraphSummary | null>(null);
  const [analytics, setAnalytics] = useState<CareerGraphAnalytics | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [rebuilding, setRebuilding] = useState(false);
  const [analyzingGaps, setAnalyzingGaps] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeKinds, setActiveKinds] = useState<GraphNodeKind[]>(ALL_KINDS);

  const fetchGraph = useCallback(async () => {
    setLoadState("loading");
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/v1/career-graph"),
        fetch("/api/v1/career-graph/summary"),
      ]);
      if (!gRes.ok || !sRes.ok) throw new Error("fetch failed");
      const [{ graph: g }, { summary: s }] = await Promise.all([gRes.json(), sRes.json()]);
      setGraph(g);
      setSummary(s);
      setLoadState("success");
    } catch {
      setLoadState("error");
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/career-graph/analytics");
      if (res.ok) {
        const d = await res.json();
        setAnalytics(d.analytics ?? d);
      }
    } catch {}
  }, []);

  const runGapAnalysis = async () => {
    setAnalyzingGaps(true);
    try {
      const res = await fetch("/api/v1/career-graph/gap-detection");
      if (res.ok) {
        const d = await res.json();
        setGapAnalysis(d.analysis);
        setTab("gaps");
      }
    } catch {}
    setAnalyzingGaps(false);
  };

  const triggerRebuild = async () => {
    setRebuilding(true);
    try {
      await fetch("/api/v1/career-graph", { method: "POST" });
      await Promise.all([fetchGraph(), fetchAnalytics()]);
    } finally {
      setRebuilding(false);
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "analytics" && !analytics) fetchAnalytics();
    if (t === "gaps" && !gapAnalysis) runGapAnalysis();
  };

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const toggleKind = (kind: GraphNodeKind) =>
    setActiveKinds(prev => prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind]);

  const filteredKinds = activeKinds.length === ALL_KINDS.length ? undefined : activeKinds;

  return (
    <div className="min-h-screen bg-[#030307] text-slate-100 p-6 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/30 px-3 py-1 text-xs font-semibold text-indigo-300">
            <GitBranch className="h-3.5 w-3.5" /> Career Intelligence Graph
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-transparent">
            Career Graph
          </h1>
          <p className="text-slate-400 text-sm">
            {summary ? `${summary.totalNodes} nodes · ${summary.totalEdges} connections · ${Math.round(summary.completenessScore)}% complete` : "Your career intelligence network"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={runGapAnalysis} disabled={analyzingGaps}
            className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 hover:bg-purple-950/60 text-purple-300 font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all">
            <Search className={`h-3.5 w-3.5 ${analyzingGaps ? "animate-spin" : ""}`} />
            {analyzingGaps ? "Analyzing..." : "Detect Gaps"}
          </button>
          <button onClick={triggerRebuild} disabled={rebuilding}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all">
            <RefreshCw className={`h-3.5 w-3.5 ${rebuilding ? "animate-spin" : ""}`} />
            {rebuilding ? "Rebuilding..." : "Rebuild Graph"}
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Nodes", value: summary.totalNodes, color: "#6366f1" },
            { label: "Edges", value: summary.totalEdges, color: "#10b981" },
            { label: "Completeness", value: `${Math.round(summary.completenessScore)}%`, color: "#f59e0b" },
            { label: "Last Updated", value: new Date(summary.lastUpdated).toLocaleDateString(undefined, { month: "short", day: "numeric" }), color: "#6b7280" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-base font-black" style={{ color }}>{value}</span>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-2 border-b border-slate-800 pb-0">
        {([
          { id: "graph" as Tab, label: "Graph View", icon: <GitBranch className="h-3.5 w-3.5" /> },
          { id: "analytics" as Tab, label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
          { id: "gaps" as Tab, label: "Gap Detection", icon: <Cpu className="h-3.5 w-3.5" /> },
        ]).map(({ id, label, icon }) => (
          <button key={id} onClick={() => handleTabChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide border-b-2 transition-all -mb-px ${
              tab === id
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── GRAPH TAB ── */}
      {tab === "graph" && (
        <div className="space-y-4">
          {/* Legend */}
          {summary && Object.keys(summary.nodesByKind).length > 0 && (
            <GraphLegend
              nodesByKind={summary.nodesByKind as Partial<Record<GraphNodeKind, number>>}
              activeKinds={activeKinds}
              onToggle={toggleKind}
            />
          )}

          {loadState === "loading" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl h-[580px] flex flex-col items-center justify-center gap-4">
              <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-slate-400 text-sm">Loading Career Graph…</p>
            </div>
          )}

          {loadState === "error" && (
            <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-16 flex flex-col items-center gap-4">
              <p className="text-rose-400 text-sm">Failed to load graph.</p>
              <button onClick={fetchGraph} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Retry</button>
            </div>
          )}

          {loadState === "success" && graph && graph.nodes.length > 0 ? (
            <div className="relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <CareerGraphCanvas
                graph={graph}
                onNodeClick={setSelectedNode}
                {...(filteredKinds ? { filterKinds: filteredKinds } : {})}
                width={1080}
                height={580}
              />
              <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
            </div>
          ) : loadState === "success" ? (
            <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-20 flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <GitBranch className="h-8 w-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-white">Graph is empty</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">Upload a resume or apply to a job to start building your Career Intelligence Graph.</p>
              <button onClick={triggerRebuild} disabled={rebuilding}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl">
                {rebuilding ? "Building..." : "Build from existing data"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === "analytics" && (
        <div>
          {analytics ? (
            <GraphAnalyticsPanel analytics={analytics} />
          ) : (
            <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-16 flex flex-col items-center gap-4">
              <BarChart3 className="h-10 w-10 text-slate-600" />
              <h3 className="text-base font-bold text-white">Loading Analytics…</h3>
              <button onClick={fetchAnalytics} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Load Analytics</button>
            </div>
          )}
        </div>
      )}

      {/* ── GAP DETECTION TAB ── */}
      {tab === "gaps" && (
        <div>
          {analyzingGaps && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 flex flex-col items-center gap-4">
              <Cpu className="h-10 w-10 text-purple-400 animate-pulse" />
              <p className="text-slate-300 text-sm font-medium">AI analyzing your career graph for gaps and opportunities…</p>
            </div>
          )}
          {!analyzingGaps && gapAnalysis ? (
            <GraphGapPanel analysis={gapAnalysis} />
          ) : !analyzingGaps ? (
            <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-16 flex flex-col items-center gap-4">
              <Search className="h-10 w-10 text-slate-600" />
              <h3 className="text-base font-bold text-white">No Gap Analysis Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm text-center">Run AI gap detection to find missing skills, hidden opportunities, and relationship insights.</p>
              <button onClick={runGapAnalysis}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl">
                Run Gap Detection
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
