import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;
const idSchema = z.string().uuid();

interface Context {
  params: Params;
}

async function getId(params: Params) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function GET(_req: NextRequest, ctx: Context) {
  try {
    const resumeId = await getId(ctx.params);
    if (!resumeId) return apiError("Invalid resume ID.", 400);

    const user = await requireUser();
    const ownsResume = await prisma.resume.count({
      where: { id: resumeId, userId: user.id },
    });
    if (!ownsResume) return apiError("Resume not found.", 404);

    const versions = await prisma.resumeVersion.findMany({
      where: { resumeId, userId: user.id },
      orderBy: { version: "desc" },
      take: 50,
    });

    return apiOk(versions.map((version) => ({
      id: version.id,
      version: version.version,
      title: version.title,
      data: version.data,
      createdAt: version.createdAt.toISOString(),
    })));
  } catch (error) {
    return errorToResponse(error);
  }
}
