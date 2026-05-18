import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { CoachService } from "@/lib/services/coach.service";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await CoachService.listSessions(user.id);
    const list = sessions.map((s) => {
      const msgs = Array.isArray(s.messages) ? s.messages : [];
      const first = msgs.find(
        (m): m is { role: string; content?: string } =>
          typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "user"
      );
      return {
        id: s.id,
        title: s.title,
        mode: s.mode,
        updatedAt: s.updatedAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        preview: first?.content?.slice(0, 80) ?? "",
      };
    });
    return NextResponse.json({ sessions: list });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const session = await CoachService.createSession(user.id, parsed.data.title);
    return NextResponse.json({ session: { id: session.id, title: session.title } });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
