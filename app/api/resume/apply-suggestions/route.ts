import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { apiError, errorToResponse } from "@/lib/api/response";
import type { ResumeData } from "@/lib/storage";
import type { ResumeSuggestion } from "@/types/suggestions";

export const runtime = "nodejs";

const suggestionSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1).max(120),
  original: z.string(),
  suggested: z.string(),
  status: z.enum(["pending", "accepted", "rejected", "edited"]).optional(),
}).passthrough();

const requestSchema = z.object({
  resumeId: z.string().uuid(),
  sessionId: z.string().optional(),
  resumeSnapshot: z.unknown().optional(),
  suggestions: z.array(suggestionSchema).min(1),
});

type PathSegment = string | number;
type LooseRecord = Record<string, unknown>;
type ApplicableSuggestion = Pick<ResumeSuggestion, "path" | "original" | "suggested"> & {
  status?: ResumeSuggestion["status"] | undefined;
};

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};
}

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}

function splitSkills(value: string) {
  return value
    .split(/[\n,]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function parsePath(path: string): PathSegment[] | null {
  if (!/^[a-zA-Z]+(?:\[\d+\]|\.[a-zA-Z0-9_]+|\.\d+)*$/.test(path)) return null;
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function isAllowedPath(segments: PathSegment[]) {
  const [root, indexOrField, field] = segments;

  if (root === "title" && segments.length === 1) return true;

  if (root === "personal" && typeof indexOrField === "string" && segments.length === 2) {
    return ["name", "email", "phone", "location", "summary"].includes(indexOrField);
  }

  if (root === "experience" && typeof indexOrField === "number" && typeof field === "string" && segments.length === 3) {
    return ["company", "role", "startDate", "endDate", "points"].includes(field);
  }

  if (root === "education" && typeof indexOrField === "number" && typeof field === "string" && segments.length === 3) {
    return ["school", "degree", "year"].includes(field);
  }

  if (root === "skills" && (segments.length === 1 || (segments.length === 2 && typeof indexOrField === "number"))) {
    return true;
  }

  return false;
}

function readTarget(root: ResumeData, segments: PathSegment[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
    } else {
      if (!current || typeof current !== "object") return undefined;
      current = (current as LooseRecord)[segment];
    }
  }
  return current;
}

function writeTarget(root: ResumeData, segments: PathSegment[], value: string | string[]) {
  let current: unknown = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined) return false;
    if (typeof segment === "number") {
      if (!Array.isArray(current) || !current[segment]) return false;
      current = current[segment];
    } else {
      if (!current || typeof current !== "object") return false;
      current = (current as LooseRecord)[segment];
    }
  }

  const last = segments[segments.length - 1];
  if (last === undefined) return false;
  if (typeof last === "number") {
    if (!Array.isArray(current)) return false;
    current[last] = value;
    return true;
  }

  if (!current || typeof current !== "object") return false;
  (current as LooseRecord)[last] = value;
  return true;
}

function applySuggestion(draft: ResumeData, suggestion: Pick<ResumeSuggestion, "path" | "original" | "suggested">) {
  const segments = parsePath(suggestion.path);
  if (!segments || !isAllowedPath(segments)) return false;

  if (segments[0] === "skills" && segments.length === 1) {
    draft.skills = splitSkills(suggestion.suggested);
    return true;
  }

  const current = readTarget(draft, segments);
  if (typeof current !== "string") return false;

  const nextValue = suggestion.original && current.includes(suggestion.original)
    ? current.replace(suggestion.original, suggestion.suggested)
    : suggestion.suggested;

  return writeTarget(draft, segments, nextValue);
}

function applySuggestions(baseResume: ResumeData, suggestions: ApplicableSuggestion[]) {
  const draft: ResumeData = JSON.parse(JSON.stringify(baseResume)) as ResumeData;
  let appliedCount = 0;

  for (const suggestion of suggestions) {
    const shouldApply = suggestion.status === "accepted" || suggestion.status === "edited" || suggestion.status === undefined;
    if (!shouldApply || !suggestion.suggested.trim()) continue;
    if (applySuggestion(draft, suggestion)) appliedCount += 1;
  }

  draft.updatedAt = new Date().toISOString();
  return { resume: normalizeResume(draft), appliedCount };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid apply-suggestions request.", 400);

    const { resumeId, suggestions } = parsed.data;
    const existing = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true, title: true, data: true, version: true },
    });

    if (!existing) return apiError("Resume not found.", 404);

    const currentResume = normalizeResume({
      ...asRecord(existing.data),
      id: existing.id,
      title: existing.title,
    });
    const { resume: updatedResume, appliedCount } = applySuggestions(currentResume, suggestions);

    if (appliedCount === 0) {
      return apiError("No accepted suggestions could be applied.", 400);
    }

    const latestVersion = await prisma.resumeVersion.findFirst({
      where: { resumeId: existing.id, userId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const snapshotVersion = Math.max(existing.version, (latestVersion?.version ?? 0) + 1);
    const nextVersion = snapshotVersion + 1;

    await prisma.$transaction(async (tx) => {
      await tx.resumeVersion.create({
        data: {
          resumeId: existing.id,
          userId,
          version: snapshotVersion,
          title: `Before AI suggestions - ${existing.title}`,
          data: existing.data as Prisma.InputJsonValue,
        },
      });

      await tx.resume.update({
        where: { id: existing.id },
        data: {
          title: updatedResume.title,
          data: updatedResume as unknown as Prisma.InputJsonValue,
          version: nextVersion,
        },
      });
    });

    return NextResponse.json({
      data: {
        resumeId: existing.id,
        appliedCount,
        version: nextVersion,
        updatedResume,
      },
      error: null,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
