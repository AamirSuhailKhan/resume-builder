import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NetworkingService } from "@/lib/networking/networking.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    
    const contact = await NetworkingService.updateContact(id, body);
    return NextResponse.json({ contact });
  } catch (error) {
    logger.error({ error }, "[PATCH /api/v1/networking/contacts/[id]] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await NetworkingService.deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "[DELETE /api/v1/networking/contacts/[id]] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
