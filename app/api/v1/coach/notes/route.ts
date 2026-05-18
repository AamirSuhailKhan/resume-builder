import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CoachPaywallError, requirePro } from "@/lib/auth/require-pro";
import { CoachService } from "@/lib/services/coach.service";

export const runtime = "nodejs";

const postSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  sessionId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const user = await requirePro();
    const notes = await CoachService.listNotes(user.id);
    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof CoachPaywallError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 402 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePro();
    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const note = await CoachService.saveNote(user.id, parsed.data.content, parsed.data.sessionId);
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof CoachPaywallError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 402 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
