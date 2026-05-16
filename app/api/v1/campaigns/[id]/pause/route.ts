import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    
    const campaign = await prisma.emailCampaign.findUnique({ where: { id }});
    if (!campaign || campaign.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: { status: "paused" }
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Internal server error", { status: 500 });
  }
}
