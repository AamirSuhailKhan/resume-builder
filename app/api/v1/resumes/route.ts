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

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    
    const parsedQuery = querySchema.safeParse({
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });
    
    if (!parsedQuery.success) {
      return apiError("Invalid query parameters.", 400, "VALIDATION_ERROR", parsedQuery.error.flatten());
    }
    
    const resumes = await listUserResumes(user.id, parsedQuery.data.limit);
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
