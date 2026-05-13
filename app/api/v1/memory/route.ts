import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { memoryService } from "@/lib/services/memory.service";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const createMemorySchema = z.object({
  type: z.enum([
    "work_experience",
    "education",
    "project",
    "professional_summary",
    "skills",
    "certification",
    "achievement",
  ]),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(8000),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().trim().min(1).max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** GET /api/v1/memory — list all memories (embedding excluded from response) */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const query = req.nextUrl.searchParams.get("q");
    const type  = req.nextUrl.searchParams.get("type") ?? undefined;
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 100);

    // Semantic search mode
    if (query) {
      const results = await memoryService.searchMemories(user.id, query, limit);
      // Strip embedding (never send 1536 floats over the wire)
      return apiOk(results.map(({ ...m }) => m));
    }

    // Regular list mode — never return the embedding column
    const memories = await prisma.careerMemory.findMany({
      where: { userId: user.id, ...(type ? { type } : {}) },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        confidence: true,
        source: true,
        metadata: true,
        evidenceRef: true,
        createdAt: true,
        updatedAt: true,
        // embedding deliberately omitted
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return apiOk(memories);
  } catch (error) {
    return errorToResponse(error);
  }
}

/** POST /api/v1/memory — create a memory with embedding */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createMemorySchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid memory data.", 400);

    const memory = await memoryService.upsertMemory(user.id, {
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      ...(parsed.data.confidence !== undefined ? { confidence: parsed.data.confidence } : {}),
      ...(parsed.data.source !== undefined ? { source: parsed.data.source } : {}),
      ...(parsed.data.metadata !== undefined ? { metadata: parsed.data.metadata } : {}),
    });
    return apiOk(memory, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
