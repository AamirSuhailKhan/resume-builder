import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: name is required (1-100 chars)." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });

    return apiOk({ updated: true });
  } catch (error) {
    return errorToResponse(error);
  }
}
