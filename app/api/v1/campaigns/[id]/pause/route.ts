import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.options";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
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
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
