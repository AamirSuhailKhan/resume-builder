import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { OutreachGenerationService } from "@/lib/services/outreach-generation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return apiError("Unauthorized", 401);

    const p = await params;

    const { tone } = (await req.json()) as { tone?: "formal" | "casual" };

    const job = await prisma.jobOpportunity.findUnique({
      where: { id: p.id },
    });

    if (!job || job.userId !== userId) {
      return apiError("Job opportunity not found", 404);
    }

    const connection = await prisma.connectionPath.findUnique({
      where: { id: p.connectionId },
    });

    if (!connection || connection.userId !== userId || connection.jobOpportunityId !== job.id) {
      return apiError("Connection path not found", 404);
    }

    const outreachService = new OutreachGenerationService();
    const message = await outreachService.generateMessage(
      userId,
      connection,
      job,
      tone || "casual"
    );

    return apiOk({ message });
  } catch (error) {
    return errorToResponse(error);
  }
}
