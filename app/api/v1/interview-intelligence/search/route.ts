import { NextRequest } from "next/server";
import { InterviewDifficulty, InterviewQuestionKind } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const kindValues = Object.values(InterviewQuestionKind) as [InterviewQuestionKind, ...InterviewQuestionKind[]];
const difficultyValues = Object.values(InterviewDifficulty) as [InterviewDifficulty, ...InterviewDifficulty[]];

const searchSchema = z.object({
  q: z.string().trim().min(1).max(300),
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(160).optional(),
  kind: z.enum(kindValues).optional(),
  difficulty: z.enum(difficultyValues).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const parsed = searchSchema.safeParse({
      q: req.nextUrl.searchParams.get("q"),
      company: req.nextUrl.searchParams.get("company") ?? undefined,
      role: req.nextUrl.searchParams.get("role") ?? undefined,
      kind: req.nextUrl.searchParams.get("kind") ?? undefined,
      difficulty: req.nextUrl.searchParams.get("difficulty") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return apiError("Invalid interview search query.", 400);
    const results = await InterviewIntelligenceService.search({
      query: parsed.data.q,
      ...(parsed.data.company ? { company: parsed.data.company } : {}),
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.limit ? { limit: parsed.data.limit } : {}),
      ...(user?.id ? { userId: user.id } : {}),
    });
    return apiOk(results);
  } catch (error) {
    return errorToResponse(error);
  }
}
