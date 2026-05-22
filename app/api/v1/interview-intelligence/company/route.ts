import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const companySchema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().max(160).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const parsed = companySchema.safeParse({
      company: req.nextUrl.searchParams.get("company"),
      role: req.nextUrl.searchParams.get("role") ?? undefined,
    });
    if (!parsed.success) return apiError("Company is required.", 400);
    const terminal = await InterviewIntelligenceService.getCompanyTerminal(
      parsed.data.company,
      parsed.data.role || undefined,
      user?.id
    );
    return apiOk(terminal);
  } catch (error) {
    return errorToResponse(error);
  }
}
