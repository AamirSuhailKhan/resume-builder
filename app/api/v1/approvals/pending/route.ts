import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: {
        userId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        payload: true,
        riskFlags: true,
        expiresAt: true,
        createdAt: true,
        workflowId: true,
      },
    });

    // Load workflow goals in a single query
    const workflowIds = [...new Set(approvals.map((a) => a.workflowId).filter(Boolean))] as string[];
    const workflows = workflowIds.length
      ? await prisma.workflowRun.findMany({
          where: { id: { in: workflowIds } },
          select: { id: true, type: true, goal: true, status: true },
        })
      : [];
    const workflowMap = new Map(workflows.map((w) => [w.id, w]));

    const enriched = approvals.map((a) => ({
      ...a,
      expiresAt: a.expiresAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      workflowRun: a.workflowId ? workflowMap.get(a.workflowId) ?? null : null,
    }));

    return NextResponse.json({ approvals: enriched });
  } catch (err) {
    console.error("[approvals/pending]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
