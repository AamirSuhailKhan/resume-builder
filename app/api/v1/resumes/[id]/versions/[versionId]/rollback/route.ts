import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { invalidateCoachPrompt } from "@/lib/coach/cache";
import { serializeResume } from "@/lib/resumes/repository";

export const runtime = "nodejs";

type Params = Promise<{ id: string; versionId: string }>;
const idSchema = z.string().uuid();

interface Context {
  params: Params;
}

export async function POST(_req: NextRequest, ctx: Context) {
  try {
    const params = await ctx.params;
    const resumeId = idSchema.safeParse(params.id);
    const versionId = idSchema.safeParse(params.versionId);
    if (!resumeId.success || !versionId.success) return apiError("Invalid version request.", 400);

    const user = await requireUser();
    const version = await prisma.resumeVersion.findFirst({
      where: {
        id: versionId.data,
        resumeId: resumeId.data,
        userId: user.id,
      },
    });

    if (!version) return apiError("Version not found.", 404);

    const resume = await prisma.resume.update({
      where: { id: resumeId.data },
      data: {
        title: version.title,
        data: version.data as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    await prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        userId: user.id,
        version: resume.version,
        title: resume.title,
        data: resume.data as Prisma.InputJsonValue,
      },
    });

    await invalidateCoachPrompt(user.id).catch(() => undefined);

    return apiOk(serializeResume(resume));
  } catch (error) {
    return errorToResponse(error);
  }
}
