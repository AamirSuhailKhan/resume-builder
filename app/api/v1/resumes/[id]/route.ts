import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { getUserResume } from "@/lib/resumes/repository";
import { enqueueAutosave } from "@/lib/queue/producer";
import { normalizeResume } from "@/lib/normalizeResume";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

interface Context {
  params: Params;
}

const idSchema = z.string().uuid();
const updateResumeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  createVersion: z.boolean().optional(),
}).passthrough();

async function getId(params: Params) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    const id = await getId(ctx.params);
    if (!id) return apiError("Invalid resume ID.", 400);

    const user = await requireUser();
    const resume = await getUserResume(user.id, id);
    if (!resume) return apiError("Resume not found.", 404);

    return apiOk(resume);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PUT(req: NextRequest, ctx: Context) {
  try {
    const id = await getId(ctx.params);
    if (!id) return apiError("Invalid resume ID.", 400);

    const user = await requireUser();
    const existing = await prisma.resume.findFirst({
      where: { id, userId: user.id },
      select: { id: true, title: true },
    });
    if (!existing) return apiError("Resume not found.", 404);

    const body = await req.json().catch(() => null);
    const parsed = updateResumeSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid resume data.", 400);

    const source = parsed.data.data ?? parsed.data;
    const normalized = normalizeResume({
      ...source,
      id,
      title: parsed.data.title ?? source.title ?? existing.title,
    });

    const jobRecord = await prisma.job.create({
      data: {
        type: "autosave",
        status: "queued",
        userId: user.id,
        resumeId: id,
        payload: {
          userId: user.id,
          resumeId: id,
          title: normalized.title,
          data: normalized,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await enqueueAutosave({
      jobRecordId: jobRecord.id,
      userId: user.id,
      resumeId: id,
      title: normalized.title,
      data: normalized as unknown as Record<string, unknown>,
      createVersion: parsed.data.createVersion ?? false,
    });

    return apiOk({
      jobId: jobRecord.id,
      status: "queued",
      data: normalized,
    }, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  try {
    const id = await getId(ctx.params);
    if (!id) return apiError("Invalid resume ID.", 400);

    const user = await requireUser();
    const deleted = await prisma.resume.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) return apiError("Resume not found.", 404);

    return apiOk({ success: true });
  } catch (error) {
    return errorToResponse(error);
  }
}
