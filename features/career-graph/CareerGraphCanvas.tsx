"use client";

import React, { useEffect, useRef, useCallback } from "react";
import type { CareerGraph, GraphNode, GraphEdge, GraphNodeKind } from "@/lib/career-graph/types";

// ─── Color map per node kind ──────────────────────────────────────────────────
const NODE_COLORS: Record<GraphNodeKind, string> = {
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

const NODE_RADIUS: Record<GraphNodeKind, number> = {
  SKILL: 14,
  EXPERIENCE: 22,
  PROJECT: 18,
  CERTIFICATION: 16,
  EDUCATION: 20,
  APPLICATION: 20,
  INTERVIEW: 18,
  COMPANY: 24,
  RECRUITER: 16,
  CAREER_GOAL: 20,
  SALARY_TARGET: 18,
  JOB_MATCH: 16,
  SKILL_GAP: 16,
  OFFER: 22,
};

// ─── Force simulation types ───────────────────────────────────────────────────
interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface SimEdge extends GraphEdge {
  source: SimNode;
  target: SimNode;
}

// ─── Minimal force-directed simulation (no D3 dependency) ────────────────────
function runSimulation(nodes: SimNode[], edges: SimEdge[], width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const ITERATIONS = 120;
  const REPULSION = 4000;
  const SPRING_LENGTH = 120;
  const SPRING_K = 0.04;
  const DAMPING = 0.85;
  const GRAVITY = 0.03;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Spring attraction along edges
    for (const edge of edges) {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - SPRING_LENGTH) * SPRING_K * edge.weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      edge.source.vx += fx;
      edge.source.vy += fy;
      edge.target.vx -= fx;
      edge.target.vy -= fy;
    }

    // Gravity toward center
    for (const node of nodes) {
      node.vx += (cx - node.x) * GRAVITY;
      node.vy += (cy - node.y) * GRAVITY;
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
      // Clamp
      node.x = Math.max(40, Math.min(width - 40, node.x));
      node.y = Math.max(40, Math.min(height - 40, node.y));
    }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CareerGraphCanvasProps {
  graph: CareerGraph;
  onNodeClick?: (node: GraphNode) => void;
  width?: number;
  height?: number;
  filterKinds?: GraphNodeKind[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CareerGraphCanvas({
  graph,
  onNodeClick,
  width = 900,
  height = 600,
  filterKinds,
}: CareerGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const hoveredRef = useRef<SimNode | null>(null);

  // ─── Build simulation ──────────────────────────────────────────────────────
  const build = useCallback(() => {
    const filteredNodes = filterKinds
      ? graph.nodes.filter((n) => filterKinds.includes(n.kind))
      : graph.nodes;

    const nodeMap = new Map<string, SimNode>();
    const cx = width / 2;
    const cy = height / 2;

    const simNodes: SimNode[] = filteredNodes.map((n) => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 50 + Math.random() * 200;
      const node: SimNode = {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
      nodeMap.set(n.id, node);
      return node;
    });

    const simEdges: SimEdge[] = graph.edges
      .map((e) => {
        const source = nodeMap.get(e.sourceNodeId);
        const target = nodeMap.get(e.targetNodeId);
        if (!source || !target) return null;
        return { ...e, source, target } as SimEdge;
      })
      .filter((e): e is SimEdge => e !== null);

    runSimulation(simNodes, simEdges, width, height);

    simNodesRef.current = simNodes;
    simEdgesRef.current = simEdges;
  }, [graph, filterKinds, width, height]);

  // ─── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    // Edges
    for (const edge of simEdgesRef.current) {
      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + edge.weight * 0.12})`;
      ctx.lineWidth = 0.8 + edge.weight * 1.2;
      ctx.stroke();
    }

    // Nodes
    for (const node of simNodesRef.current) {
      const color = NODE_COLORS[node.kind] ?? "#6b7280";
      const radius = (NODE_RADIUS[node.kind] ?? 14) * (0.7 + node.weight * 0.6);
      const isHovered = hoveredRef.current?.id === node.id;

      // Glow
      if (isHovered) {
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2.5);
        grad.addColorStop(0, color + "55");
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? color : color + "cc";
      ctx.fill();
      ctx.strokeStyle = isHovered ? "#fff" : color + "44";
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Label
      if (radius > 14 || isHovered) {
        ctx.fillStyle = "#fff";
        ctx.font = `${isHovered ? 600 : 400} ${isHovered ? 11 : 9}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label;
        ctx.fillText(label, node.x, node.y + radius + 10);
      }
    }
  }, [width, height]);

  // ─── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    build();
    const loop = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [build, draw]);

  // ─── Mouse interaction ─────────────────────────────────────────────────────
  const getNodeAt = (x: number, y: number): SimNode | null => {
    for (const node of simNodesRef.current) {
      const radius = (NODE_RADIUS[node.kind] ?? 14) * (0.7 + node.weight * 0.6);
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= radius * radius) return node;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    hoveredRef.current = getNodeAt(x, y);
    canvasRef.current!.style.cursor = hoveredRef.current ? "pointer" : "default";
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const node = getNodeAt(x, y);
    if (node && onNodeClick) onNodeClick(node);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ width: "100%", height: "auto", borderRadius: "12px", display: "block" }}
    />
  );
}
