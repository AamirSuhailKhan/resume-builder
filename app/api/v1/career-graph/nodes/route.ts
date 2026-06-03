/**
 * GET  /api/v1/career-graph/nodes            → all active nodes (optional ?kind=SKILL)
 * POST /api/v1/career-graph/nodes            → upsert a node manually
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { GraphService, GraphCacheService } from "@/lib/career-graph";
import type { GraphNodeKind, GraphNodePayload } from "@/lib/career-graph";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpsertNodeSchema = z.object({
  kind: z.string(),
  label: z.string().min(1).max(255),
  payload: z.record(z.string(), z.unknown()),
  weight: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sourceEntityId: z.string().optional(),
  sourceEntityType: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const kind = req.nextUrl.searchParams.get("kind") as GraphNodeKind | null;

    if (kind) {
      const nodes = await GraphService.getNodesByKind(userId, kind);
      return NextResponse.json({ nodes }, { status: 200 });
    }

    const graph = await GraphService.getGraph(userId);
    return NextResponse.json({ nodes: graph.nodes }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "[GET /api/v1/career-graph/nodes] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const parsed = UpsertNodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { kind, label, payload, weight, confidence, sourceEntityId, sourceEntityType } = parsed.data;

    const nodeId = await GraphService.upsertNode(
      userId,
      kind as GraphNodeKind,
      label,
      payload as unknown as GraphNodePayload,
      {
        ...(weight !== undefined ? { weight } : {}),
        ...(confidence !== undefined ? { confidence } : {}),
        ...(sourceEntityId !== undefined ? { sourceEntityId } : {}),
        ...(sourceEntityType !== undefined ? { sourceEntityType } : {}),
      }
    );

    await GraphService.recomputeMeta(userId);
    await GraphCacheService.invalidateAll(userId);

    return NextResponse.json({ nodeId }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "[POST /api/v1/career-graph/nodes] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
