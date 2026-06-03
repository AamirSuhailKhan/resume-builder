"use client";

import React, { useState } from "react";
import type { GraphNode, GraphNodeKind } from "@/lib/career-graph/types";

const KIND_LABELS: Record<GraphNodeKind, string> = {
  SKILL: "Skill",
  EXPERIENCE: "Experience",
  PROJECT: "Project",
  CERTIFICATION: "Certification",
  EDUCATION: "Education",
  APPLICATION: "Application",
  INTERVIEW: "Interview",
  COMPANY: "Company",
  RECRUITER: "Recruiter",
  CAREER_GOAL: "Career Goal",
  SALARY_TARGET: "Salary Target",
  JOB_MATCH: "Job Match",
  SKILL_GAP: "Skill Gap",
  OFFER: "Offer",
};

const KIND_COLORS: Record<GraphNodeKind, string> = {
  SKILL: "#6366f1",
  EXPERIENCE: "#10b981",
  PROJECT: "#f59e0b",
  CERTIFICATION: "#8b5cf6",
  EDUCATION: "#3b82f6",
  APPLICATION: "#ef4444",
  INTERVIEW: "#ec4899",
  COMPANY: "#14b8a6",
  RECRUITER: "#f97316",
  CAREER_GOAL: "#84cc16",
  SALARY_TARGET: "#22d3ee",
  JOB_MATCH: "#a78bfa",
  SKILL_GAP: "#fb923c",
  OFFER: "#fbbf24",
};

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const color = KIND_COLORS[node.kind];
  const label = KIND_LABELS[node.kind];
  const payload = node.payload as unknown as Record<string, unknown>;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 280,
        background: "rgba(15,15,25,0.97)",
        border: `1px solid ${color}44`,
        borderRadius: 12,
        padding: 20,
        zIndex: 10,
        backdropFilter: "blur(12px)",
        boxShadow: `0 0 30px ${color}22`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color,
              textTransform: "uppercase",
              display: "block",
              marginBottom: 4,
            }}
          >
            {label}
          </span>
          <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
            {node.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: 2,
          }}
        >
          ×
        </button>
      </div>

      {/* Scores */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Weight", value: node.weight },
          { label: "Confidence", value: node.confidence },
        ].map(({ label: l, value }) => (
          <div
            key={l}
            style={{
              flex: 1,
              background: "#1a1a2e",
              borderRadius: 8,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{Math.round(value * 100)}%</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Payload fields */}
      <div
        style={{
          background: "#0d0d1a",
          borderRadius: 8,
          padding: "10px 12px",
          maxHeight: 240,
          overflowY: "auto",
        }}
      >
        {Object.entries(payload)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .slice(0, 12)
          .map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: "1px solid #1f2937",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize", flexShrink: 0 }}>
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#e5e7eb",
                  textAlign: "right",
                  wordBreak: "break-word",
                  maxWidth: 140,
                }}
              >
                {Array.isArray(value)
                  ? value.join(", ") || "—"
                  : typeof value === "boolean"
                  ? value ? "Yes" : "No"
                  : String(value).slice(0, 60)}
              </span>
            </div>
          ))}
      </div>

      {/* Source */}
      {node.sourceEntityType && (
        <div style={{ marginTop: 10, fontSize: 10, color: "#4b5563" }}>
          Source: {node.sourceEntityType} · {node.sourceEntityId?.slice(0, 8)}…
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

interface GraphLegendProps {
  nodesByKind: Partial<Record<GraphNodeKind, number>>;
  activeKinds: GraphNodeKind[];
  onToggle: (kind: GraphNodeKind) => void;
}

export function GraphLegend({ nodesByKind, activeKinds, onToggle }: GraphLegendProps) {
  const kinds = Object.entries(nodesByKind) as [GraphNodeKind, number][];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: "10px 14px",
        background: "rgba(15,15,25,0.9)",
        borderRadius: 10,
        border: "1px solid #1f2937",
      }}
    >
      {kinds.map(([kind, count]) => {
        const color = KIND_COLORS[kind];
        const isActive = activeKinds.includes(kind);
        return (
          <button
            key={kind}
            onClick={() => onToggle(kind)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 20,
              border: `1px solid ${isActive ? color : "#374151"}`,
              background: isActive ? color + "22" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isActive ? color : "#374151",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: isActive ? "#e5e7eb" : "#6b7280", fontWeight: 500 }}>
              {KIND_LABELS[kind]}
            </span>
            <span
              style={{
                fontSize: 10,
                color: isActive ? color : "#4b5563",
                fontWeight: 600,
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Graph Stats Bar ─────────────────────────────────────────────────────────

interface GraphStatsProps {
  totalNodes: number;
  totalEdges: number;
  completenessScore: number;
  lastUpdated: string;
}

export function GraphStatsBar({ totalNodes, totalEdges, completenessScore, lastUpdated }: GraphStatsProps) {
  const stats = [
    { label: "Nodes", value: totalNodes, color: "#6366f1" },
    { label: "Edges", value: totalEdges, color: "#10b981" },
    { label: "Completeness", value: `${Math.round(completenessScore)}%`, color: "#f59e0b" },
  ];

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {stats.map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: "#0d0d1a",
            borderRadius: 8,
            padding: "8px 14px",
            display: "flex",
            gap: 6,
            alignItems: "baseline",
            border: "1px solid #1f2937",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{label}</span>
        </div>
      ))}
      <span style={{ fontSize: 11, color: "#374151", marginLeft: "auto" }}>
        Updated {new Date(lastUpdated).toLocaleDateString()}
      </span>
    </div>
  );
}
