import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";

export const runtime = "nodejs";

const createMemorySchema = z.object({
  type: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(8000),
  evidenceRef: z.string().trim().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().trim().min(1).max(80).optional(),
  visibility: z.enum(["private", "user_visible", "agent_visible"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
    const memories = await CareerOSService.listMemories(user.id, {
      type,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return apiOk(memories);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createMemorySchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid memory data.", 400);

    const memory = await CareerOSService.createMemory(user.id, {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });
    return apiOk(memory, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
