/**
 * career-graph.test.ts
 * Unit tests for the Career Graph Engine services.
 * Uses vitest globals (defined in vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

const mockPrisma = {
  careerGraphNode: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  careerGraphEdge: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  careerGraphMeta: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  careerGraphEvent: {
    create: vi.fn(),
  },
  careerGraphSnapshot: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  resume: { findFirst: vi.fn(), findUnique: vi.fn() },
  application: { findMany: vi.fn(), count: vi.fn() },
  jobOpportunity: { count: vi.fn() },
  interviewMockSession: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
  skillGapAnalysis: { findMany: vi.fn() },
  negotiationSession: { findMany: vi.fn() },
  careerProfile: { findUnique: vi.fn() },
  anonymousBenchmark: { findMany: vi.fn() },
  recruiterInteraction: { count: vi.fn() },
};

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GraphService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getGraph returns nodes and edges", async () => {
    const now = new Date();
    mockPrisma.careerGraphNode.findMany.mockResolvedValue([
      {
        id: "node-1",
        userId: "u1",
        kind: "SKILL",
        label: "React",
        payload: { name: "React", category: "frontend", proficiencyLevel: 0.9, yearsOfExperience: 3, lastUsed: null, marketDemand: 0.9, isVerified: true, sources: ["resume"] },
        weight: 0.8,
        confidence: 0.9,
        sourceEntityId: null,
        sourceEntityType: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    mockPrisma.careerGraphEdge.findMany.mockResolvedValue([]);
    mockPrisma.careerGraphMeta.findUnique.mockResolvedValue({
      lastComputedAt: now,
      graphVersion: 1,
    });

    const { GraphService } = await import("@/lib/career-graph/graph.service");
    const graph = await GraphService.getGraph("u1");

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]!.kind).toBe("SKILL");
    expect(graph.edges).toHaveLength(0);
    expect(graph.version).toBe(1);
  });

  it("getSummary returns zeroed state when meta missing", async () => {
    mockPrisma.careerGraphMeta.findUnique.mockResolvedValue(null);

    const { GraphService } = await import("@/lib/career-graph/graph.service");
    const summary = await GraphService.getSummary("u1");

    expect(summary.totalNodes).toBe(0);
    expect(summary.totalEdges).toBe(0);
    expect(summary.completenessScore).toBe(0);
  });

  it("upsertNode creates a new node when none exists", async () => {
    mockPrisma.careerGraphNode.findFirst.mockResolvedValue(null);
    mockPrisma.careerGraphNode.create.mockResolvedValue({ id: "new-node-id" });
    mockPrisma.careerGraphEvent.create.mockResolvedValue({});

    const { GraphService } = await import("@/lib/career-graph/graph.service");
    const nodeId = await GraphService.upsertNode(
      "u1",
      "SKILL",
      "TypeScript",
      {
        name: "TypeScript",
        category: "technical",
        proficiencyLevel: 0.8,
        yearsOfExperience: 2,
        lastUsed: null,
        marketDemand: 0.85,
        isVerified: false,
        sources: ["resume"],
      }
    );

    expect(mockPrisma.careerGraphNode.create).toHaveBeenCalledOnce();
    expect(nodeId).toBe("new-node-id");
  });

  it("upsertNode updates existing node when found", async () => {
    const existingNode = { id: "existing-id", weight: 0.5, confidence: 0.6 };
    mockPrisma.careerGraphNode.findFirst.mockResolvedValue(existingNode);
    mockPrisma.careerGraphNode.update.mockResolvedValue({ id: "existing-id" });
    mockPrisma.careerGraphEvent.create.mockResolvedValue({});

    const { GraphService } = await import("@/lib/career-graph/graph.service");
    const nodeId = await GraphService.upsertNode(
      "u1",
      "SKILL",
      "TypeScript",
      {
        name: "TypeScript",
        category: "technical",
        proficiencyLevel: 0.9,
        yearsOfExperience: 3,
        lastUsed: null,
        marketDemand: 0.85,
        isVerified: true,
        sources: ["resume", "project"],
      }
    );

    expect(mockPrisma.careerGraphNode.update).toHaveBeenCalledOnce();
    expect(mockPrisma.careerGraphNode.create).not.toHaveBeenCalled();
    expect(nodeId).toBe("existing-id");
  });

  it("recomputeMeta calculates completeness correctly", async () => {
    mockPrisma.careerGraphNode.groupBy.mockResolvedValue([
      { kind: "SKILL", _count: { id: 5 } },
      { kind: "EXPERIENCE", _count: { id: 2 } },
      { kind: "EDUCATION", _count: { id: 1 } },
    ]);
    mockPrisma.careerGraphEdge.groupBy.mockResolvedValue([]);
    mockPrisma.careerGraphNode.count.mockResolvedValue(8);
    mockPrisma.careerGraphEdge.count.mockResolvedValue(4);
    mockPrisma.careerGraphMeta.upsert.mockResolvedValue({});
    mockPrisma.careerGraphEvent.create.mockResolvedValue({});

    const { GraphService } = await import("@/lib/career-graph/graph.service");
    await GraphService.recomputeMeta("u1");

    const call = mockPrisma.careerGraphMeta.upsert.mock.calls[0]![0] as { create: { completenessScore: number } };
    // SKILL + EXPERIENCE + EDUCATION all present = 3/3 required = 100% of 60 points = 60
    // No optional kinds = 0/4 optional = 0% of 40 points = 0
    // Total = 60
    expect(call.create.completenessScore).toBe(60);
  });
});

// ─── GraphCacheService tests ──────────────────────────────────────────────────

describe("GraphCacheService keys", () => {
  it("generates namespaced keys", async () => {
    const { GraphCacheKeys } = await import("@/lib/career-graph/graph-cache.service");
    expect(GraphCacheKeys.graph("u1")).toBe("career_graph:u1:full");
    expect(GraphCacheKeys.summary("u1")).toBe("career_graph:u1:summary");
    expect(GraphCacheKeys.analytics("u1")).toBe("career_graph:u1:analytics");
    expect(GraphCacheKeys.history("u1", 30)).toBe("career_graph:u1:history:30");
  });
});

// ─── Types test ───────────────────────────────────────────────────────────────

describe("GraphNodeKind enum", () => {
  it("exports all 14 node kinds", async () => {
    const { GraphNodeKind } = await import("@/lib/career-graph/types");
    const keys = Object.keys(GraphNodeKind);
    expect(keys).toHaveLength(14);
    expect(keys).toContain("SKILL");
    expect(keys).toContain("OFFER");
    expect(keys).toContain("SKILL_GAP");
  });
});

describe("GraphEdgeKind enum", () => {
  it("exports all edge kinds", async () => {
    const { GraphEdgeKind } = await import("@/lib/career-graph/types");
    expect(Object.keys(GraphEdgeKind).length).toBeGreaterThanOrEqual(20);
  });
});
