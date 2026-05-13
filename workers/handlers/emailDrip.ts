import { Job } from "bullmq";
import { EmailDripPayload } from "@/lib/queue/types";
import { prisma } from "@/lib/db/prisma";
import nodemailer from "nodemailer";
import Redis from "ioredis";
import { writeAuditEvent } from "@/lib/domain/audit/audit.service";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const DAILY_LIMIT = 10;

export async function handleEmailDrip(job: Job<EmailDripPayload>) {
  const { emailDraftId, userId, campaignId } = job.data;

  const draft = await prisma.emailDraft.findUnique({
    where: { id: emailDraftId },
    include: { campaign: true }
  });

  if (!draft) {
    throw new Error(`EmailDraft ${emailDraftId} not found`);
  }

  // Idempotency / State Checks
  if (draft.status === "sent") {
    console.log(`Draft ${emailDraftId} already sent, skipping.`);
    return;
  }
  
  if (draft.campaign.status === "replied" || draft.campaign.status === "paused") {
    await prisma.emailDraft.update({
      where: { id: emailDraftId },
      data: { status: "skipped" }
    });
    return;
  }

  if (draft.status !== "scheduled") {
    console.log(`Draft ${emailDraftId} is not scheduled (status: ${draft.status}), skipping.`);
    return;
  }

  // Check Daily Rate Limit
  const today = new Date().toISOString().split("T")[0];
  const limitKey = `email_limit:${userId}:${today}`;
  const sentCount = await redis.incr(limitKey);
  
  if (sentCount === 1) {
    await redis.expire(limitKey, 86400); // 24 hours
  }

  if (sentCount > DAILY_LIMIT) {
    // Re-queue for tomorrow
    console.log(`User ${userId} reached daily limit. Re-queueing draft ${emailDraftId}`);
    await redis.decr(limitKey); // revert increment
    throw new Error("Daily limit reached, retrying later."); // This triggers BullMQ backoff
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // SMTP Transport
  const smtpHost = process.env.SMTP_HOST;
  const isSmtpConfigured = !!smtpHost;

  if (isSmtpConfigured && draft.campaign.recruiterEmail) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    try {
      await transporter.sendMail({
        from: user?.email,
        to: draft.campaign.recruiterEmail,
        subject: draft.subject,
        text: draft.body,
      });
    } catch (e) {
      console.error("Nodemailer error:", e);
      // Revert limit counter if send failed
      await redis.decr(limitKey);
      throw e; 
    }
  } else {
    console.log(`SMTP not configured or missing recruiter email. Simulating send for draft ${emailDraftId}`);
  }

  // Mark as sent
  await prisma.emailDraft.update({
    where: { id: emailDraftId },
    data: { 
      status: "sent",
      sentAt: new Date()
    }
  });

  // Audit Event
  await writeAuditEvent({
    userId,
    action: "email_campaign.sent",
    entityType: "EmailCampaign",
    entityId: campaignId,
    metadata: {
      draftId: emailDraftId,
      sequence: draft.sequence,
      simulated: !isSmtpConfigured
    }
  });
}
