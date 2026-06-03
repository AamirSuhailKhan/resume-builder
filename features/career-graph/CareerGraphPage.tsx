"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { CareerGraph, GraphNode, GraphNodeKind, GraphSummary } from "@/lib/career-graph/types";
import { NodeDetailPanel, GraphLegend, GraphStatsBar } from "./GraphControls";

// Lazy-load the heavy canvas component — D3/canvas bundle is only fetched
// when the user actually navigates to /career-graph.
const CareerGraphCanvas = dynamic(
  () => import("./CareerGraphCanvas").then((m) => m.CareerGraphCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 620,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Initialising graph…
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadState = "idle" | "loading" | "success" | "error";

const ALL_KINDS: GraphNodeKind[] = [
  "SKILL", "EXPERIENCE", "PROJECT", "CERTIFICATION", "EDUCATION",
  "APPLICATION", "INTERVIEW", "COMPANY", "RECRUITER", "CAREER_GOAL",
  "SALARY_TARGET", "JOB_MATCH", "SKILL_GAP", "OFFER",
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useCareerGraph() {
  const [graph, setGraph] = useState<CareerGraph | null>(null);
  const [summary, setSummary] = useState<GraphSummary | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [rebuilding, setRebuilding] = useState(false);

  const fetchGraph = useCallback(async () => {
    setState("loading");
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/v1/career-graph"),
        fetch("/api/v1/career-graph/summary"),
      ]);
      if (!gRes.ok || !sRes.ok) throw new Error("Failed to fetch graph");
      const [{ graph: g }, { summary: s }] = await Promise.all([gRes.json(), sRes.json()]);
      setGraph(g);
      setSummary(s);
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  const triggerRebuild = useCallback(async () => {
    setRebuilding(true);
    try {
      await fetch("/api/v1/career-graph", { method: "POST" });
      await fetchGraph();
    } finally {
      setRebuilding(false);
    }
  }, [fetchGraph]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  return { graph, summary, state, rebuilding, fetchGraph, triggerRebuild };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CareerGraphPage() {
  const { graph, summary, state, rebuilding, triggerRebuild } = useCareerGraph();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeKinds, setActiveKinds] = useState<GraphNodeKind[]>(ALL_KINDS);

  const toggleKind = useCallback((kind: GraphNodeKind) => {
    setActiveKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  }, []);

  if (state === "loading") {
    return (
      <div style={styles.centered}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.spinner} />
        <p style={{ color: "#6b7280", marginTop: 16, fontSize: 14 }}>Loading Career Graph…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={styles.centered}>
        <p style={{ color: "#ef4444", fontSize: 14 }}>Failed to load graph.</p>
        <button onClick={triggerRebuild} style={styles.rebuildBtn}>
          Rebuild Graph
        </button>
      </div>
    );
  }

  const nodesByKind = summary?.nodesByKind ?? {};
  const filteredKinds = activeKinds.length === ALL_KINDS.length ? undefined : activeKinds;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Career Graph</h1>
          <p style={styles.subtitle}>
            Your career intelligence — {summary?.totalNodes ?? 0} entities, {summary?.totalEdges ?? 0} connections
          </p>
        </div>
        <button
          onClick={triggerRebuild}
          disabled={rebuilding}
          style={{ ...styles.rebuildBtn, opacity: rebuilding ? 0.6 : 1 }}
        >
          {rebuilding ? "Rebuilding…" : "↺ Rebuild"}
        </button>
      </div>

      {/* Stats */}
      {summary && (
        <div style={{ marginBottom: 16 }}>
          <GraphStatsBar
            totalNodes={summary.totalNodes}
            totalEdges={summary.totalEdges}
            completenessScore={summary.completenessScore}
            lastUpdated={summary.lastUpdated}
          />
        </div>
      )}

      {/* Legend */}
      {Object.keys(nodesByKind).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <GraphLegend
            nodesByKind={nodesByKind as Partial<Record<GraphNodeKind, number>>}
            activeKinds={activeKinds}
            onToggle={toggleKind}
          />
        </div>
      )}

      {/* Graph Canvas */}
      {graph && graph.nodes.length > 0 ? (
        <div style={styles.canvasWrapper}>
          <CareerGraphCanvas
            graph={graph}
            onNodeClick={setSelectedNode}
            {...(filteredKinds ? { filterKinds: filteredKinds } : {})}
            width={1080}
            height={620}
          />
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
          <h3 style={{ color: "#e5e7eb", fontSize: 18, fontWeight: 600 }}>Graph is empty</h3>
          <p style={{ color: "#6b7280", fontSize: 14, maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>
            Upload a resume or apply to a job to start building your Career Graph.
          </p>
          <button onClick={triggerRebuild} disabled={rebuilding} style={{ ...styles.rebuildBtn, marginTop: 20 }}>
            {rebuilding ? "Building…" : "Build from existing data"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "24px 28px",
    background: "#050508",
    minHeight: "100vh",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "#f9fafb",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  canvasWrapper: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid #1f2937",
    background: "#0a0a0f",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    fontFamily: "Inter, sans-serif",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #1f2937",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 80,
    background: "#0a0a0f",
    borderRadius: 16,
    border: "1px dashed #1f2937",
  },
  rebuildBtn: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
};
