"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import type { CareerGraph, GraphNode, GraphEdge, GraphNodeKind } from "@/lib/career-graph/types";

const NODE_COLORS: Record<GraphNodeKind, string> = {
  SKILL: "#6366f1", EXPERIENCE: "#10b981", PROJECT: "#f59e0b",
  CERTIFICATION: "#8b5cf6", EDUCATION: "#3b82f6", APPLICATION: "#ef4444",
  INTERVIEW: "#ec4899", COMPANY: "#14b8a6", RECRUITER: "#f97316",
  CAREER_GOAL: "#84cc16", SALARY_TARGET: "#22d3ee", JOB_MATCH: "#a78bfa",
  SKILL_GAP: "#fb923c", OFFER: "#fbbf24",
};

const NODE_RADIUS: Record<GraphNodeKind, number> = {
  SKILL: 13, EXPERIENCE: 22, PROJECT: 17, CERTIFICATION: 15, EDUCATION: 19,
  APPLICATION: 19, INTERVIEW: 17, COMPANY: 23, RECRUITER: 15,
  CAREER_GOAL: 20, SALARY_TARGET: 17, JOB_MATCH: 15, SKILL_GAP: 15, OFFER: 21,
};

interface SimNode extends GraphNode { x: number; y: number; vx: number; vy: number; }
interface SimEdge extends GraphEdge { source: SimNode; target: SimNode; }

function runSim(nodes: SimNode[], edges: SimEdge[], W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const ITER = 150, REP = 5000, SL = 130, SK = 0.035, DAMP = 0.82, G = 0.025;
  for (let i = 0; i < ITER; i++) {
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a]!, nb = nodes[b]!;
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = REP / (d * d);
        na.vx -= (dx / d) * f; na.vy -= (dy / d) * f;
        nb.vx += (dx / d) * f; nb.vy += (dy / d) * f;
      }
    }
    for (const e of edges) {
      const dx = e.target.x - e.source.x, dy = e.target.y - e.source.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - SL) * SK * e.weight;
      e.source.vx += (dx / d) * f; e.source.vy += (dy / d) * f;
      e.target.vx -= (dx / d) * f; e.target.vy -= (dy / d) * f;
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * G; n.vy += (cy - n.y) * G;
      n.vx *= DAMP; n.vy *= DAMP;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(50, Math.min(W - 50, n.x));
      n.y = Math.max(50, Math.min(H - 50, n.y));
    }
  }
}

interface Props {
  graph: CareerGraph;
  onNodeClick?: (node: GraphNode) => void;
  width?: number;
  height?: number;
  filterKinds?: GraphNodeKind[];
}

export function CareerGraphCanvas({ graph, onNodeClick, width = 1080, height = 580, filterKinds }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);
  const hoveredRef = useRef<SimNode | null>(null);
  const dragRef = useRef<SimNode | null>(null);
  const animRef = useRef<number | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const isPanRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const tickRef = useRef(0);

  const build = useCallback(() => {
    const filtered = filterKinds ? graph.nodes.filter(n => filterKinds.includes(n.kind)) : graph.nodes;
    const nodeMap = new Map<string, SimNode>();
    const cx = width / 2, cy = height / 2;
    const simNodes: SimNode[] = filtered.map(n => {
      const a = Math.random() * 2 * Math.PI, r = 60 + Math.random() * 220;
      const sn: SimNode = { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 };
      nodeMap.set(n.id, sn);
      return sn;
    });
    const simEdges: SimEdge[] = graph.edges
      .map(e => { const s = nodeMap.get(e.sourceNodeId), t = nodeMap.get(e.targetNodeId); return s && t ? { ...e, source: s, target: t } as SimEdge : null; })
      .filter((e): e is SimEdge => e !== null);
    runSim(simNodes, simEdges, width, height);
    simNodesRef.current = simNodes;
    simEdgesRef.current = simEdges;
  }, [graph, filterKinds, width, height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ox = offsetRef.current.x, oy = offsetRef.current.y, sc = scaleRef.current;
    tickRef.current += 0.02;
    const t = tickRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 0.5;
    const gridSize = 40 * sc;
    for (let x = (ox % gridSize); x < width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = (oy % gridSize); y < height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(sc, sc);

    // Animated edges
    for (const edge of simEdgesRef.current) {
      const alpha = 0.06 + edge.weight * 0.18;
      const color = NODE_COLORS[edge.source.kind] ?? "#6366f1";

      // Animated dash
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -t * 8;
      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = (0.8 + edge.weight * 1.4) / sc;
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head
      const dx = edge.target.x - edge.source.x, dy = edge.target.y - edge.source.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const tr = (NODE_RADIUS[edge.target.kind] ?? 14) * (0.7 + edge.target.weight * 0.5);
      const ax = edge.target.x - ux * (tr + 4), ay = edge.target.y - uy * (tr + 4);
      const perpX = -uy * 4, perpY = ux * 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - ux * 8 + perpX, ay - uy * 8 + perpY);
      ctx.lineTo(ax - ux * 8 - perpX, ay - uy * 8 - perpY);
      ctx.closePath();
      ctx.fillStyle = `${color}88`;
      ctx.fill();
    }

    // Nodes
    for (const node of simNodesRef.current) {
      const color = NODE_COLORS[node.kind] ?? "#6b7280";
      const r = (NODE_RADIUS[node.kind] ?? 13) * (0.7 + node.weight * 0.55);
      const isHovered = hoveredRef.current?.id === node.id;
      const isDragged = dragRef.current?.id === node.id;

      // Pulse ring for skill gaps
      if (node.kind === "SKILL_GAP") {
        const pulse = 1 + 0.3 * Math.sin(t * 2 + node.x);
        ctx.beginPath(); ctx.arc(node.x, node.y, r * pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}15`; ctx.fill();
      }

      // Glow
      if (isHovered || isDragged) {
        const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3);
        g.addColorStop(0, `${color}44`); g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }

      // Circle
      ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? color : `${color}cc`; ctx.fill();
      ctx.strokeStyle = isHovered ? "#ffffff88" : `${color}55`;
      ctx.lineWidth = (isHovered ? 2.5 : 1) / sc; ctx.stroke();

      // Inner icon indicator
      if (r > 12) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `${Math.max(8, r * 0.65)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const icons: Record<string, string> = {
          SKILL: "⚡", EXPERIENCE: "💼", PROJECT: "🏗", CERTIFICATION: "🏅",
          EDUCATION: "🎓", APPLICATION: "📬", INTERVIEW: "🎯", COMPANY: "🏢",
          RECRUITER: "👤", CAREER_GOAL: "🚀", SALARY_TARGET: "💰", JOB_MATCH: "🔍",
          SKILL_GAP: "⚠", OFFER: "⭐",
        };
        ctx.fillText(icons[node.kind] ?? "•", node.x, node.y);
      }

      // Label
      if (r > 11 || isHovered) {
        ctx.fillStyle = isHovered ? "#ffffff" : "rgba(255,255,255,0.7)";
        ctx.font = `${isHovered ? "600" : "400"} ${isHovered ? 11 : 9}px Inter, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        const lbl = node.label.length > 16 ? node.label.slice(0, 14) + "…" : node.label;
        ctx.fillText(lbl, node.x, node.y + r + 4);
      }
    }

    ctx.restore();

    // Zoom indicator
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(sc * 100)}%`, width - 12, height - 10);
  }, [width, height]);

  useEffect(() => {
    build();
    const loop = () => { draw(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [build, draw]);

  const toWorld = (cx: number, cy: number) => ({
    x: (cx - offsetRef.current.x) / scaleRef.current,
    y: (cy - offsetRef.current.y) / scaleRef.current,
  });

  const getNodeAt = (wx: number, wy: number): SimNode | null => {
    for (const node of simNodesRef.current) {
      const r = (NODE_RADIUS[node.kind] ?? 13) * (0.7 + node.weight * 0.55);
      const dx = node.x - wx, dy = node.y - wy;
      if (dx * dx + dy * dy <= r * r) return node;
    }
    return null;
  };

  const getCanvasXY = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (width / rect.width), y: (e.clientY - rect.top) * (height / rect.height) };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasXY(e);
    if (dragRef.current) {
      const w = toWorld(x, y);
      dragRef.current.x = w.x; dragRef.current.y = w.y;
      dragRef.current.vx = 0; dragRef.current.vy = 0;
      return;
    }
    if (isPanRef.current) {
      offsetRef.current.x = panStartRef.current.ox + (x - panStartRef.current.x);
      offsetRef.current.y = panStartRef.current.oy + (y - panStartRef.current.y);
      return;
    }
    const w = toWorld(x, y);
    hoveredRef.current = getNodeAt(w.x, w.y);
    canvasRef.current!.style.cursor = hoveredRef.current ? "pointer" : "grab";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasXY(e);
    const w = toWorld(x, y);
    const node = getNodeAt(w.x, w.y);
    if (node) { dragRef.current = node; canvasRef.current!.style.cursor = "grabbing"; }
    else {
      isPanRef.current = true;
      panStartRef.current = { x, y, ox: offsetRef.current.x, oy: offsetRef.current.y };
      canvasRef.current!.style.cursor = "grabbing";
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const { x, y } = getCanvasXY(e);
    const w = toWorld(x, y);
    if (dragRef.current) {
      const node = getNodeAt(w.x, w.y);
      if (node && onNodeClick) onNodeClick(node);
      dragRef.current = null;
    }
    isPanRef.current = false;
    canvasRef.current!.style.cursor = "grab";
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasXY(e as unknown as React.MouseEvent);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scaleRef.current * delta));
    offsetRef.current.x = x - (x - offsetRef.current.x) * (newScale / scaleRef.current);
    offsetRef.current.y = y - (y - offsetRef.current.y) * (newScale / scaleRef.current);
    scaleRef.current = newScale;
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current = null; isPanRef.current = false; hoveredRef.current = null; }}
      onWheel={handleWheel}
      style={{ width: "100%", height: "auto", display: "block", cursor: "grab", borderRadius: "1.5rem" }}
    />
  );
}
