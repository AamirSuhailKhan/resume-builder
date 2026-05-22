import { NextRequest } from "next/server";
import { TwinMemoryType } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerTwinService } from "@/lib/twin/career-twin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memorySchema = z.object({
  type: z.nativeEnum(TwinMemoryType),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(10000),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().trim().min(1).max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = req.nextUrl.searchParams.get("q");
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8), 30);
    if (!q) return apiError("Missing memory query.", 400);
    const results = await CareerTwinService.searchMemory(user.id, q, Number.isFinite(limit) ? limit : 8);
    return apiOk(results);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = memorySchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid Twin memory.", 400);
    const memory = await CareerTwinService.createTwinMemory(user.id, parsed.data);
    return apiOk(memory, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
