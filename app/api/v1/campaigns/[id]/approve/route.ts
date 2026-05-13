import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.options";
import { EmailCampaignService } from "@/lib/services/email-campaign.service";

const campaignService = new EmailCampaignService();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const campaign = await campaignService.approveAndSchedule(session.user.id, id);
    return NextResponse.json(campaign);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
