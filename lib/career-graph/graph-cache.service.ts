/**
 * graph-cache.service.ts
 * Graph-aware cache keys and invalidation strategies.
 * Wraps CacheService with graph-specific TTLs and key namespacing.
 */
import { CacheService } from "@/lib/cache/cache.service";
import type { CareerGraph, GraphSummary, CareerGraphAnalytics } from "./types";

// ─── TTLs (seconds) ────────────────────────────────────────────────────────────
const TTL = {
  GRAPH: 300,        // 5 min — full graph (large payload)
  SUMMARY: 120,      // 2 min — meta counts
  ANALYTICS: 600,    // 10 min — analytics (heavier compute)
  HISTORY: 3600,     // 1 hr  — historical snapshots rarely change
  NEIGHBORS: 60,     // 1 min — traversal results
} as const;

// ─── Key builders ──────────────────────────────────────────────────────────────
export const GraphCacheKeys = {
  graph:      (userId: string) => `career_graph:${userId}:full`,
  summary:    (userId: string) => `career_graph:${userId}:summary`,
  analytics:  (userId: string) => `career_graph:${userId}:analytics`,
  history:    (userId: string, days: number) => `career_graph:${userId}:history:${days}`,
  neighbors:  (userId: string, nodeId: string) => `career_graph:${userId}:neighbors:${nodeId}`,
  nodesByKind:(userId: string, kind: string) => `career_graph:${userId}:nodes:${kind}`,
};

// ─── Cache Service ─────────────────────────────────────────────────────────────

export class GraphCacheService {
  // ── Full Graph ──────────────────────────────────────────────────────────────

  static async getGraph(userId: string): Promise<CareerGraph | null> {
    return CacheService.get<CareerGraph>(GraphCacheKeys.graph(userId));
  }

  static async setGraph(userId: string, graph: CareerGraph): Promise<void> {
    await CacheService.set(GraphCacheKeys.graph(userId), graph, TTL.GRAPH);
  }

  static async rememberGraph(userId: string, compute: () => Promise<CareerGraph>): Promise<CareerGraph> {
    return CacheService.remember(GraphCacheKeys.graph(userId), compute, TTL.GRAPH);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  static async getSummary(userId: string): Promise<GraphSummary | null> {
    return CacheService.get<GraphSummary>(GraphCacheKeys.summary(userId));
  }

  static async rememberSummary(userId: string, compute: () => Promise<GraphSummary>): Promise<GraphSummary> {
    return CacheService.remember(GraphCacheKeys.summary(userId), compute, TTL.SUMMARY);
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  static async getAnalytics(userId: string): Promise<CareerGraphAnalytics | null> {
    return CacheService.get<CareerGraphAnalytics>(GraphCacheKeys.analytics(userId));
  }

  static async rememberAnalytics(
    userId: string,
    compute: () => Promise<CareerGraphAnalytics>
  ): Promise<CareerGraphAnalytics> {
    return CacheService.remember(GraphCacheKeys.analytics(userId), compute, TTL.ANALYTICS);
  }

  // ── History ────────────────────────────────────────────────────────────────

  static async rememberHistory<T>(userId: string, days: number, compute: () => Promise<T>): Promise<T> {
    return CacheService.remember(GraphCacheKeys.history(userId, days), compute, TTL.HISTORY);
  }

  // ── Invalidation ────────────────────────────────────────────────────────────

  /**
   * Invalidate all graph-related caches for a user.
   * Call after any graph mutation (node upsert, edge creation, etc.).
   */
  static async invalidateAll(userId: string): Promise<void> {
    await CacheService.invalidate(
      GraphCacheKeys.graph(userId),
      GraphCacheKeys.summary(userId),
      GraphCacheKeys.analytics(userId),
      GraphCacheKeys.history(userId, 30),
      GraphCacheKeys.history(userId, 7),
      GraphCacheKeys.history(userId, 90),
    );
  }

  /**
   * Partial invalidation — only summary + analytics (e.g. after a weight update).
   */
  static async invalidateMeta(userId: string): Promise<void> {
    await CacheService.invalidate(
      GraphCacheKeys.summary(userId),
      GraphCacheKeys.analytics(userId),
    );
  }
}
