import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { invalidateCoachPrompt } from "@/lib/coach/cache";
import { normalizeResume } from "@/lib/normalizeResume";
import { ResumeData } from "@/lib/storage";
import { AppError } from "@/lib/errors";

export function serializeResume(row: {
  id: string;
  title: string;
  data: Prisma.JsonValue;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    data: normalizeResume({
      ...(typeof row.data === "object" && row.data ? row.data : {}),
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }),
  };
}

export async function getUserResume(userId: string, resumeId: string) {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });
    return resume ? serializeResume(resume) : null;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError("Database query failed", 500, error.code, error.meta);
    }
    throw error;
  }
}

export async function listUserResumes(userId: string, limit = 20) {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return resumes.map(serializeResume);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError("Database query failed", 500, error.code, error.meta);
    }
    throw error;
  }
}

export async function createUserResume(userId: string, data: ResumeData) {
  const normalized = normalizeResume(data);
  try {
    const resume = await prisma.resume.create({
      data: {
        id: normalized.id,
        userId,
        title: normalized.title,
        data: normalized as unknown as Prisma.InputJsonValue,
        status: normalized.status ?? "completed",
        versions: {
          create: {
            userId,
            version: 1,
            title: normalized.title,
            data: normalized as unknown as Prisma.InputJsonValue,
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { activeResumeId: resume.id },
    }).catch(() => undefined);

    await invalidateCoachPrompt(userId).catch(() => undefined);

    return serializeResume(resume);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError("Database query failed", 500, error.code, error.meta);
    }
    throw error;
  }
}
