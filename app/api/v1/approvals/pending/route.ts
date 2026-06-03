import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { apiOk, errorToResponse } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();

    // 1. Fetch pending email drafts that are waiting for approval
    const pendingDrafts = await prisma.emailDraft.findMany({
      where: {
        status: "pending_approval",
        campaign: {
          userId: user.id,
        },
      },
      include: {
        campaign: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    const emailApprovals = pendingDrafts.map((draft) => ({
      id: draft.id,
      type: "email_follow_up",
      title: `Approve follow-up email to ${draft.campaign.recruiterName || "recruiter"} at ${draft.campaign.companyName}`,
      summary: `AI generated sequence ${draft.sequence} follow-up for your application to ${draft.campaign.jobTitle}.`,
      payload: {
        subject: draft.subject,
        body: draft.body,
        campaignId: draft.campaignId,
        sequence: draft.sequence,
        formFields: [
          { field: "Subject", value: draft.subject },
          { field: "Recipient", value: draft.campaign.recruiterEmail || "Unknown Recruiter" },
          { field: "Sequence", value: `Email #${draft.sequence}` },
        ],
      },
      riskFlags: null,
      expiresAt: new Date(draft.scheduledAt.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours expiry
      createdAt: draft.campaign.createdAt.toISOString(),
      workflowId: draft.campaignId,
      workflowRun: {
        id: draft.campaignId,
        type: "email_campaign",
        goal: `Follow up on ${draft.campaign.jobTitle} application at ${draft.campaign.companyName}`,
        status: draft.campaign.status,
      },
    }));

    // 2. Fetch any BrowserExecution status that is waiting_for_approval
    const pendingExecutions = await prisma.browserExecution.findMany({
      where: {
        status: "waiting_for_approval",
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const executionApprovals = pendingExecutions.map((exec) => {
      const metadata = exec.metadata && typeof exec.metadata === "object" ? (exec.metadata as Record<string, unknown>) : {};
      return {
        id: exec.id,
        type: "browser_action",
        title: `Approve browser automation action: ${exec.currentTitle || "Form Submission"}`,
        summary: `The AI Agent is ready to perform an action on ${exec.currentUrl || "external site"}. Please review.`,
        payload: {
          currentUrl: exec.currentUrl,
          screenshotData: typeof metadata.screenshotUrl === "string" ? metadata.screenshotUrl : null,
          formFields: Array.isArray(metadata.fieldsToFill) ? metadata.fieldsToFill : [],
        },
        riskFlags: metadata.riskFlags && typeof metadata.riskFlags === "object" ? metadata.riskFlags : null,
        expiresAt: new Date(exec.updatedAt.getTime() + 15 * 60 * 1000).toISOString(), // 15 mins expiry
        createdAt: exec.createdAt.toISOString(),
        workflowId: exec.workflowId,
        workflowRun: {
          id: exec.workflowId,
          type: "browser_automation",
          goal: exec.currentTitle || "Automated Application",
          status: "running",
        },
      };
    });

    return apiOk({
      approvals: [...emailApprovals, ...executionApprovals],
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
