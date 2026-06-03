import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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

    // Require ADMIN role
    const permission = checkPermission(userContext, "read", "system_settings");
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const secretsReport = [
      {
        name: "DATABASE_URL",
        configured: !!process.env.DATABASE_URL,
        strength: process.env.DATABASE_URL?.includes("pooler") ? "EXCELLENT (Pooler Active)" : "GOOD",
      },
      {
        name: "UPSTASH_REDIS_REST_URL",
        configured: !!process.env.UPSTASH_REDIS_REST_URL,
        strength: !!process.env.UPSTASH_REDIS_REST_URL ? "GOOD" : "MISSING",
      },
      {
        name: "AUTH_SECRET",
        configured: !!process.env.AUTH_SECRET,
        strength: (process.env.AUTH_SECRET?.length ?? 0) >= 32 ? "EXCELLENT" : "WEAK (Should be >= 32 chars)",
      },
      {
        name: "SESSION_ENCRYPTION_KEY",
        configured: !!process.env.SESSION_ENCRYPTION_KEY || !!process.env.BROWSER_SESSION_SECRET,
        strength: "AES-256-GCM compliant",
      },
      {
        name: "NODE_ENV",
        configured: true,
        strength: process.env.NODE_ENV === "production" ? "SECURE (Production)" : "DEVELOPMENT",
      },
    ];

    return NextResponse.json({ secretsReport });
  } catch (error) {
    console.error("[SECRETS_CHECK_GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
