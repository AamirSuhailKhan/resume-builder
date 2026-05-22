import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { CareerTwinService } from "@/lib/twin/career-twin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const simulationSchema = z.object({
  question: z.string().trim().min(8).max(1000),
  targetRole: z.string().trim().min(2).max(120).optional(),
  targetSkill: z.string().trim().min(2).max(120).optional(),
  horizonMonths: z.number().int().min(3).max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = simulationSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid simulation request.", 400);
    const simulation = await CareerTwinService.simulate(user.id, parsed.data);
    return apiOk(simulation, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
