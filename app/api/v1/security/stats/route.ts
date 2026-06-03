import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/security/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userContext = {
      id: session.user.id,
      role: session.user.role || "USER",
      plan: (session.user.plan as any) || "free",
    };

    // Enforce RBAC: Only ADMIN or MANAGER can access security logs
    const permission = checkPermission(userContext, "read", "audit_logs");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    // Fetch dashboard telemetry
    const [
      totalLogs,
      failedAudits,
      activeAlerts,
      criticalAlerts,
      logsByAction,
      recentAlerts,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { status: "FAILED" } }),
      prisma.securityAlert.count({ where: { status: "OPEN" } }),
      prisma.securityAlert.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 5,
      }),
      prisma.securityAlert.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalLogs,
        failedAudits,
        activeAlerts,
        criticalAlerts,
      },
      logsByAction: logsByAction.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      recentAlerts,
    });
  } catch (error) {
    console.error("[SECURITY_STATS_API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
