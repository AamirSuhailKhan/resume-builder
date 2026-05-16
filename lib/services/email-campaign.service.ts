import { prisma } from "@/lib/db/prisma";
import { enqueueJob } from "@/lib/queue/producer";
import { CampaignIntelligenceService } from "./campaign-intelligence.service";
import crypto from "crypto";

export class EmailCampaignService {
  private intelligenceService = new CampaignIntelligenceService();

  async createCampaign(userId: string, jobOpportunityId: string) {
    const job = await prisma.jobOpportunity.findUnique({
      where: { id: jobOpportunityId },
      include: {
        hiringContacts: true,
      }
    });

    if (!job || job.userId !== userId) {
      throw new Error("Job opportunity not found");
    }

    const application = await prisma.application.findFirst({
      where: { jobOpportunityId, userId },
      include: { resume: true }
    });

    const contact = job.hiringContacts[0] || null;
    const resumeData = application?.resume?.data || {};

    const drafts = await this.intelligenceService.generateSequence(
      userId,
      job,
      contact,
      resumeData
    );

    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        jobOpportunityId,
        applicationId: application?.id || null,
        recruiterName: contact?.name || null,
        recruiterEmail: contact?.email || null,
        jobTitle: job.role,
        companyName: job.company,
        status: "active",
        stage: "follow_up",
        unsubscribeToken: crypto.randomBytes(32).toString('hex'),
        emails: {
          create: drafts.map(d => ({
            sequence: d.sequence,
            subject: d.subject,
            body: d.body,
            explainability: d.explainability as any,
            scheduledAt: new Date(Date.now() + d.delayDays * 24 * 60 * 60 * 1000),
            status: "pending_approval",
          }))
        }
      },
      include: {
        emails: true
      }
    });

    return campaign;
  }

  async approveAndSchedule(userId: string, campaignId: string) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { emails: true }
    });

    if (!campaign || campaign.userId !== userId) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "active") {
      throw new Error("Campaign is not active");
    }

    for (const draft of campaign.emails) {
      if (draft.status === "pending_approval") {
        await prisma.emailDraft.update({
          where: { id: draft.id },
          data: { status: "scheduled" }
        });

        // Enqueue delayed job
        const delayMs = Math.max(0, draft.scheduledAt.getTime() - Date.now());
        await enqueueJob("email_drip", {
          userId,
          jobRecordId: draft.id,
          emailDraftId: draft.id,
          campaignId: campaign.id
        }, {
          delay: delayMs,
          jobId: `email_drip:${draft.id}`
        });
      }
    }

    return campaign;
  }
}
