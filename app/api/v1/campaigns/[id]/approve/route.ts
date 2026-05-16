import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { EmailCampaignService } from "@/lib/services/email-campaign.service";

const campaignService = new EmailCampaignService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const campaign = await campaignService.approveAndSchedule(session.user.id, id);
    return NextResponse.json(campaign);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Internal server error", { status: 500 });
  }
}
