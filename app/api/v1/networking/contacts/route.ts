import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NetworkingService } from "@/lib/networking/networking.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isAlumni = searchParams.get("isAlumni") === "true" ? true : undefined;
    const isRecruiter = searchParams.get("isRecruiter") === "true" ? true : undefined;
    const company = searchParams.get("company") || undefined;
    const status = searchParams.get("status") || undefined;

    const filters: {
      isAlumni?: boolean;
      isRecruiter?: boolean;
      company?: string;
      status?: string;
    } = {};
    if (isAlumni !== undefined) filters.isAlumni = isAlumni;
    if (isRecruiter !== undefined) filters.isRecruiter = isRecruiter;
    if (company !== undefined) filters.company = company;
    if (status !== undefined) filters.status = status;

    const contacts = await NetworkingService.getContacts(session.user.id, filters);

    return NextResponse.json({ contacts });
  } catch (error) {
    logger.error({ error }, "[GET /api/v1/networking/contacts] error");
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
    const contact = await NetworkingService.createContact({
      userId: session.user.id,
      name: body.name,
      title: body.title,
      company: body.company,
      school: body.school,
      graduationYear: body.graduationYear ? parseInt(body.graduationYear) : undefined,
      linkedinUrl: body.linkedinUrl,
      email: body.email,
      isAlumni: body.isAlumni,
      isRecruiter: body.isRecruiter,
      isReferralPartner: body.isReferralPartner,
      notes: body.notes
    });

    return NextResponse.json({ contact });
  } catch (error) {
    logger.error({ error }, "[POST /api/v1/networking/contacts] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
