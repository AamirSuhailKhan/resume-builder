import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { CareerTwinService } from "@/lib/twin/career-twin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    await CareerTwinService.evolve(user.id, "onboarding_generation");
    const twin = await CareerTwinService.getSnapshot(user.id);
    return apiOk(twin, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
