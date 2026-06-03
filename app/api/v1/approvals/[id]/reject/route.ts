import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;

    if (!id) {
      return apiError("Missing approval ID.", 400);
    }

    // 1. Check if it's an email draft
    const draft = await prisma.emailDraft.findFirst({
      where: {
        id,
        campaign: {
          userId: user.id,
        },
      },
    });

    if (draft) {
      const updatedDraft = await prisma.emailDraft.update({
        where: { id },
        data: { status: "skipped" },
      });
      return apiOk({ success: true, type: "email_draft", draft: updatedDraft });
    }

    // 2. Check if it's a browser execution
    const execution = await prisma.browserExecution.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (execution) {
      const updatedExecution = await prisma.browserExecution.update({
        where: { id },
        data: { status: "canceled" },
      });
      return apiOk({ success: true, type: "browser_execution", execution: updatedExecution });
    }

    return apiError("Approval record not found or not owned by the current user.", 404);
  } catch (error) {
    return errorToResponse(error);
  }
}
