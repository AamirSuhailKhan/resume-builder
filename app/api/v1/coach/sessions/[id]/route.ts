import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getUserPlan, requirePro } from "@/lib/auth/require-pro";
import { meetsPlan } from "@/lib/subscription/plans";
import { CoachService } from "@/lib/services/coach.service";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mode: z.enum(["chat", "mock_interview"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const plan = await getUserPlan(user.id);
    if (!meetsPlan(plan, "pro")) {
      return NextResponse.json({ error: "Pro subscription required." }, { status: 402 });
    }
    const { id } = await context.params;
    const session = await CoachService.getSession(user.id, id);
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        metadata: session.metadata,
        messages: session.messages,
        updatedAt: session.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePro();
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const existing = await CoachService.getSession(user.id, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Parameters<typeof CoachService.updateSession>[2] = {};
    if (parsed.data.title) patch.title = parsed.data.title;
    if (parsed.data.mode) patch.mode = parsed.data.mode;
    if (parsed.data.metadata) patch.metadata = parsed.data.metadata;
    await CoachService.updateSession(user.id, id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Upgrade")) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await CoachService.deleteSession(user.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
