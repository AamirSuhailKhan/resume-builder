import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuditService } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { action } = body;

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (action === "export") {
      const data = await AuditService.exportUserData(userId);
      return NextResponse.json({ success: true, data });
    }

    if (action === "erase") {
      await AuditService.deleteUserAccount(userId, ipAddress);
      // Client needs to clear cookies / sign out
      return NextResponse.json({
        success: true,
        message: "Your data has been successfully erased. You will be signed out.",
      });
    }

    return NextResponse.json({ error: "Invalid action. Supported: export, erase" }, { status: 400 });
  } catch (error: any) {
    console.error("[GDPR_API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
