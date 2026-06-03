import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { checkPermission } from "@/lib/security/rbac";
import { AuditService } from "@/lib/security/audit";

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

    const permission = checkPermission(userContext, "read", "audit_logs");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const alerts = await prisma.securityAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[SECURITY_ALERTS_GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const permission = checkPermission(userContext, "update", "audit_logs");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const body = await req.json();
    const { alertId, status } = body;

    if (!alertId || !status) {
      return NextResponse.json({ error: "Missing alertId or status" }, { status: 400 });
    }

    const updatedAlert = await prisma.securityAlert.update({
      where: { id: alertId },
      data: { status },
    });

    await AuditService.log({
      userId: session.user.id,
      action: "RESOLVE_ALERT",
      resource: "SECURITY",
      status: "SUCCESS",
      details: { alertId, resolvedToStatus: status },
    });

    return NextResponse.json({ success: true, alert: updatedAlert });
  } catch (error) {
    console.error("[SECURITY_ALERTS_POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
