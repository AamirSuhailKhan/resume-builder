import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerOSService } from "@/lib/services/career-os.service";

export const runtime = "nodejs";

const updateMemorySchema = z.object({
  type: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(180).optional(),
  content: z.string().trim().min(1).max(8000).optional(),
  evidenceRef: z.string().trim().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().trim().min(1).max(80).optional(),
  visibility: z.enum(["private", "user_visible", "agent_visible"]).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = updateMemorySchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid memory data.", 400);

    const memory = await CareerOSService.updateMemory(user.id, id, {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt === undefined
        ? undefined
        : parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
    });
    return apiOk(memory);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await CareerOSService.deleteMemory(user.id, id);
    return apiOk({ deleted: true });
  } catch (error) {
    return errorToResponse(error);
  }
}
