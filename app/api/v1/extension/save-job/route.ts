import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { apiOk, errorToResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const { title, company, url } = body as {
      title?: string;
      company?: string;
      url?: string;
    };

    if (!title || !company || !url) {
      return apiOk({ saved: false, error: "Missing required fields: title, company, url" });
    }

    // Prevent duplicates
    const existing = await prisma.jobOpportunity.findFirst({
      where: { userId: user.id, sourceUrl: url },
      select: { id: true },
    });

    if (existing) {
      return apiOk({ saved: false, duplicate: true, jobId: existing.id });
    }

    const job = await prisma.jobOpportunity.create({
      data: {
        userId: user.id,
        role: title,
        company,
        sourceUrl: url,
        sourceType: "web",
        matchScore: 0,
        description: "",
        location: "",
        parsed: {},
      },
    });

    return apiOk({ saved: true, jobId: job.id });
  } catch (error) {
    return errorToResponse(error);
  }
}
