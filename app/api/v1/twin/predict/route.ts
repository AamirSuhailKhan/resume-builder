import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { CareerTwinService } from "@/lib/twin/career-twin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const predictSchema = z.object({
  subject: z.object({
    type: z.string().trim().min(1).max(80).optional(),
    id: z.string().trim().max(120).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = predictSchema.parse(body);
    const predictions = await CareerTwinService.predict(user.id, parsed.subject);
    return apiOk(predictions, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
