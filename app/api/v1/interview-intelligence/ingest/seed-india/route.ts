import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireUser();
    const result = await InterviewIntelligenceService.seedIndiaCompanyIntelligence();
    return apiOk(result, 201);
  } catch (error) {
    return errorToResponse(error);
  }
}
