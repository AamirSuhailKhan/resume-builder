import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { WorkflowCoordinator } from "@/lib/orchestration";

export const runtime = "nodejs";

const cancelSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
}).optional();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => undefined);
    const parsed = cancelSchema.parse(body);
    const workflow = await WorkflowCoordinator.cancel(user.id, id, parsed?.reason);
    return apiOk(workflow);
  } catch (error) {
    return errorToResponse(error);
  }
}
