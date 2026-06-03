import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { RecruiterService } from "@/lib/recruiter/recruiter.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();
    
    const recruiter = await RecruiterService.updateRecruiter(id, {
      name: body.name,
      email: body.email,
      linkedinUrl: body.linkedinUrl,
      companyName: body.companyName,
      title: body.title,
      roleFamily: body.roleFamily,
      status: body.status,
      notes: body.notes
    });

    return NextResponse.json({ recruiter });
  } catch (error) {
    logger.error({ error }, "[PATCH /api/v1/recruiter/contacts/[id]] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    await RecruiterService.deleteRecruiter(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "[DELETE /api/v1/recruiter/contacts/[id]] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
