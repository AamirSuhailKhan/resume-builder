import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { RecruiterService } from "@/lib/recruiter/recruiter.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get("companyName") || undefined;
    const roleFamily = searchParams.get("roleFamily") || undefined;

    const filters: { companyName?: string; roleFamily?: string } = {};
    if (companyName !== undefined) filters.companyName = companyName;
    if (roleFamily !== undefined) filters.roleFamily = roleFamily;

    const recruiters = await RecruiterService.getRecruiters(session.user.id, filters);

    return NextResponse.json({ recruiters });
  } catch (error) {
    logger.error({ error }, "[GET /api/v1/recruiter/contacts] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name || !body.companyName) {
      return NextResponse.json({ error: "Missing name or companyName" }, { status: 400 });
    }

    const recruiter = await RecruiterService.createRecruiter({
      userId: session.user.id,
      name: body.name,
      email: body.email,
      linkedinUrl: body.linkedinUrl,
      companyName: body.companyName,
      title: body.title,
      roleFamily: body.roleFamily,
      notes: body.notes
    });

    return NextResponse.json({ recruiter });
  } catch (error) {
    logger.error({ error }, "[POST /api/v1/recruiter/contacts] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
