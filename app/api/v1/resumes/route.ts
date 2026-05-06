import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { createUserResume, listUserResumes } from "@/lib/resumes/repository";
import { normalizeResume } from "@/lib/normalizeResume";

export const runtime = "nodejs";

const createResumeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
    const resumes = await listUserResumes(user.id, Number.isFinite(limit) ? limit : 20);
    return apiOk(resumes);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createResumeSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid resume data.", 400);

    const source = parsed.data.data ?? parsed.data;
    const resume = await createUserResume(user.id, normalizeResume({
      ...source,
      id: parsed.data.id,
      title: parsed.data.title ?? source.title,
    }));

    return apiOk(resume, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
