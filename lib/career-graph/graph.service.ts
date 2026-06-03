/**
 * graph.service.ts
 * Core CRUD layer for CareerGraphNode and CareerGraphEdge.
 * All mutations emit a CareerGraphEvent for audit + replay.
 */
import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import type {
  GraphNode,
  GraphEdge,
  CareerGraph,
  GraphSummary,
  GraphNodeKind,
  GraphEdgeKind,
  GraphNodePayload,
} from "./types";
import { CareerGraphEventType } from "@prisma/client";

// ─── Type mapping helpers ─────────────────────────────────────────────────────

function toGraphNode(row: {
  id: string;
  userId: string;
  kind: string;
  label: string;
  payload: unknown;
  weight: number;
  confidence: number;
  sourceEntityId: string | null;
  sourceEntityType: string | null;
  createdAt: Date;
  updatedAt: Date;
}): GraphNode {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as GraphNodeKind,
    label: row.label,
    payload: row.payload as GraphNodePayload,
    weight: row.weight,
    confidence: row.confidence,
    sourceEntityId: row.sourceEntityId,
    sourceEntityType: row.sourceEntityType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toGraphEdge(row: {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: string;
  weight: number;
  metadata: unknown;
  createdAt: Date;
}): GraphEdge {
  return {
    id: row.id,
    userId: row.userId,
    sourceNodeId: row.sourceNodeId,
    targetNodeId: row.targetNodeId,
    kind: row.kind as GraphEdgeKind,
    weight: row.weight,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Graph Service ────────────────────────────────────────────────────────────

export class GraphService {
  /**
   * Fetch the complete Career Graph for a user.
   * Returns nodes + edges ready for visualization.
   */
  static async getGraph(userId: string): Promise<CareerGraph> {
    const [nodes, edges] = await Promise.all([
      prisma.careerGraphNode.findMany({
        where: { userId, isActive: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.careerGraphEdge.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const meta = await prisma.careerGraphMeta.findUnique({ where: { userId } });

    return {
      userId,
      nodes: nodes.map(toGraphNode),
      edges: edges.map(toGraphEdge),
      computedAt: meta?.lastComputedAt.toISOString() ?? new Date().toISOString(),
      version: meta?.graphVersion ?? 0,
    };
  }

  /**
   * Get summary metadata without loading all nodes/edges.
   */
  static async getSummary(userId: string): Promise<GraphSummary> {
    const meta = await prisma.careerGraphMeta.findUnique({ where: { userId } });
    if (!meta) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        nodesByKind: {} as Record<GraphNodeKind, number>,
        edgesByKind: {} as Record<GraphEdgeKind, number>,
        completenessScore: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
    return {
      totalNodes: meta.totalNodes,
      totalEdges: meta.totalEdges,
      nodesByKind: (meta.nodesByKind as Record<GraphNodeKind, number>) ?? {},
      edgesByKind: (meta.edgesByKind as Record<GraphEdgeKind, number>) ?? {},
      completenessScore: meta.completenessScore,
      lastUpdated: meta.lastComputedAt.toISOString(),
    };
  }

  /**
   * Upsert a node — create if no matching sourceEntityId/kind, else update.
   * Returns the canonical node ID.
   */
  static async upsertNode(
    userId: string,
    kind: GraphNodeKind,
    label: string,
    payload: GraphNodePayload,
    opts: {
      weight?: number;
      confidence?: number;
      sourceEntityId?: string;
      sourceEntityType?: string;
    } = {}
  ): Promise<string> {
    const existing = opts.sourceEntityId
      ? await prisma.careerGraphNode.findFirst({
          where: {
            userId,
            kind,
            sourceEntityId: opts.sourceEntityId,
          },
        })
      : await prisma.careerGraphNode.findFirst({
          where: {
            userId,
            kind,
            label,
          },
        });

    if (existing) {
      await prisma.careerGraphNode.update({
        where: { id: existing.id },
        data: {
          label,
          payload: payload as object,
          weight: opts.weight ?? existing.weight,
          confidence: opts.confidence ?? existing.confidence,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      await this._emitEvent(userId, "NODE_UPDATED", { nodeId: existing.id, kind });
      return existing.id;
    }

    const created = await prisma.careerGraphNode.create({
      data: {
        userId,
        kind,
        label,
        payload: payload as object,
        weight: opts.weight ?? 0.5,
        confidence: opts.confidence ?? 0.7,
        sourceEntityId: opts.sourceEntityId ?? null,
        sourceEntityType: opts.sourceEntityType ?? null,
        isActive: true,
      },
    });

    await this._emitEvent(userId, "NODE_ADDED", {
      nodeId: created.id,
      kind,
      sourceEntityId: opts.sourceEntityId,
    });

    return created.id;
  }

  /**
   * Upsert a directed edge between two nodes.
   */
  static async upsertEdge(
    userId: string,
    sourceNodeId: string,
    targetNodeId: string,
    kind: GraphEdgeKind,
    opts: { weight?: number; metadata?: Record<string, unknown> } = {}
  ): Promise<string> {
    const edge = await prisma.careerGraphEdge.upsert({
      where: {
        sourceNodeId_targetNodeId_kind: { sourceNodeId, targetNodeId, kind },
      },
      create: {
        userId,
        sourceNodeId,
        targetNodeId,
        kind,
        weight: opts.weight ?? 0.5,
        metadata: (opts.metadata ?? {}) as object,
      },
      update: {
        weight: opts.weight ?? 0.5,
        metadata: (opts.metadata ?? {}) as object,
      },
    });
    return edge.id;
  }

  /**
   * Soft-delete all nodes sourced from a specific entity (e.g. old resume).
   */
  static async deactivateBySource(
    userId: string,
    sourceEntityId: string,
    sourceEntityType: string
  ): Promise<void> {
    await prisma.careerGraphNode.updateMany({
      where: { userId, sourceEntityId, sourceEntityType },
      data: { isActive: false },
    });
  }

  /**
   * Recompute the CareerGraphMeta aggregate counts after mutations.
   */
  static async recomputeMeta(userId: string): Promise<void> {
    const [nodesByKindRaw, edgesByKindRaw, nodeCount, edgeCount] = await Promise.all([
      prisma.careerGraphNode.groupBy({
        by: ["kind"],
        where: { userId, isActive: true },
        _count: { id: true },
      }),
      prisma.careerGraphEdge.groupBy({
        by: ["kind"],
        where: { userId },
        _count: { id: true },
      }),
      prisma.careerGraphNode.count({ where: { userId, isActive: true } }),
      prisma.careerGraphEdge.count({ where: { userId } }),
    ]);

    const nodesByKind = Object.fromEntries(
      nodesByKindRaw.map((r) => [r.kind, r._count.id])
    );
    const edgesByKind = Object.fromEntries(
      edgesByKindRaw.map((r) => [r.kind, r._count.id])
    );

    // Completeness: score based on presence of key node types
    const requiredKinds = ["SKILL", "EXPERIENCE", "EDUCATION"] as const;
    const optionalKinds = ["PROJECT", "CERTIFICATION", "CAREER_GOAL", "SALARY_TARGET"] as const;
    const hasRequired = requiredKinds.filter((k) => (nodesByKind[k] ?? 0) > 0).length;
    const hasOptional = optionalKinds.filter((k) => (nodesByKind[k] ?? 0) > 0).length;
    const completenessScore = Math.round(
      (hasRequired / requiredKinds.length) * 60 +
        (hasOptional / optionalKinds.length) * 40
    );

    await prisma.careerGraphMeta.upsert({
      where: { userId },
      create: {
        userId,
        totalNodes: nodeCount,
        totalEdges: edgeCount,
        nodesByKind,
        edgesByKind,
        completenessScore,
        graphVersion: 1,
        lastComputedAt: new Date(),
      },
      update: {
        totalNodes: nodeCount,
        totalEdges: edgeCount,
        nodesByKind,
        edgesByKind,
        completenessScore,
        graphVersion: { increment: 1 },
        lastComputedAt: new Date(),
      },
    });

    await this._emitEvent(userId, "GRAPH_RECOMPUTED", {
      nodeCount,
      edgeCount,
      completenessScore,
    });

    logger.info({ userId, nodeCount, edgeCount, completenessScore }, "[GraphService] Meta recomputed");
  }

  /**
   * Get all nodes of a specific kind.
   */
  static async getNodesByKind(userId: string, kind: GraphNodeKind): Promise<GraphNode[]> {
    const rows = await prisma.careerGraphNode.findMany({
      where: { userId, kind, isActive: true },
      orderBy: { weight: "desc" },
    });
    return rows.map(toGraphNode);
  }

  /**
   * Get neighbors of a node (1-hop traversal).
   */
  static async getNeighbors(
    userId: string,
    nodeId: string,
    direction: "outgoing" | "incoming" | "both" = "both"
  ): Promise<{ node: GraphNode; edge: GraphEdge }[]> {
    const edges = await prisma.careerGraphEdge.findMany({
      where: {
        userId,
        ...(direction === "outgoing"
          ? { sourceNodeId: nodeId }
          : direction === "incoming"
          ? { targetNodeId: nodeId }
          : { OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }] }),
      },
      include: {
        sourceNode: true,
        targetNode: true,
      },
    });

    return edges.map((e) => {
      const neighborRow =
        e.sourceNodeId === nodeId ? e.targetNode : e.sourceNode;
      return {
        node: toGraphNode(neighborRow),
        edge: toGraphEdge(e),
      };
    });
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private static async _emitEvent(
    userId: string,
    eventType: keyof typeof CareerGraphEventType,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.careerGraphEvent.create({
        data: {
          userId,
          eventType: eventType as CareerGraphEventType,
          payload: payload as any,
        },
      });
    } catch (err) {
      logger.warn({ userId, eventType, err }, "[GraphService] Failed to emit event");
    }
  }
}
