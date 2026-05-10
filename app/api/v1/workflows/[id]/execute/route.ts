import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { WorkflowCoordinator } from "@/lib/orchestration";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await WorkflowCoordinator.startExisting(user.id, id);
    return apiOk(result, 202);
  } catch (error) {
    return errorToResponse(error);
  }
}
