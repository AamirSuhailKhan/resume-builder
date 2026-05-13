import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.options";
import { EmailCampaignService } from "@/lib/services/email-campaign.service";
import { prisma } from "@/lib/db/prisma";

const campaignService = new EmailCampaignService();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { jobOpportunityId } = await req.json();
    if (!jobOpportunityId) return new NextResponse("Missing jobOpportunityId", { status: 400 });

    const campaign = await campaignService.createCampaign(session.user.id, jobOpportunityId);
    return NextResponse.json(campaign);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId: session.user.id },
      include: {
        emails: { orderBy: { sequence: "asc" } },
        jobOpportunity: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
