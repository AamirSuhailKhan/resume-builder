import { Queue, Worker, Job } from "bullmq";
import { getQueueRedisConnection, createRedisConnection } from "./connection";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/mailer";

const QUEUE_NAME = "email-capture-drip";

// Create queue singleton
let emailCaptureQueue: Queue | undefined;

export function getEmailCaptureQueue(): Queue {
  if (!emailCaptureQueue) {
    emailCaptureQueue = new Queue(QUEUE_NAME, {
      connection: getQueueRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return emailCaptureQueue;
}

/**
 * Schedule the complete follow-up email drip sequence for a captured email.
 * - Email 2: Day 3 (3 days)
 * - Email 3: Day 7 (7 days)
 * - Email 4: Day 14 (14 days)
 */
export async function scheduleEmailSequence(emailCaptureId: string, email: string) {
  const queue = getEmailCaptureQueue();

  // Day 3 (3 * 24 * 60 * 60 * 1000 ms)
  const delayDay3 = 3 * 24 * 60 * 60 * 1000;
  await queue.add(
    "email-sequence-2",
    { emailCaptureId, email, step: 2 },
    { delay: delayDay3, jobId: `drip-2-${emailCaptureId}` }
  );

  // Day 7 (7 * 24 * 60 * 60 * 1000 ms)
  const delayDay7 = 7 * 24 * 60 * 60 * 1000;
  await queue.add(
    "email-sequence-3",
    { emailCaptureId, email, step: 3 },
    { delay: delayDay7, jobId: `drip-3-${emailCaptureId}` }
  );

  // Day 14 (14 * 24 * 60 * 60 * 1000 ms)
  const delayDay14 = 14 * 24 * 60 * 60 * 1000;
  await queue.add(
    "email-sequence-4",
    { emailCaptureId, email, step: 4 },
    { delay: delayDay14, jobId: `drip-4-${emailCaptureId}` }
  );

  console.info(`[DRIP] Successfully scheduled drip sequence for ${email} (Capture ID: ${emailCaptureId})`);
}

// Drip email content builders
const dripEmails: Record<number, (email: string) => { subject: string; html: string }> = {
  2: (email: string) => ({
    subject: "Swiggy vs Swiggy vs Razorpay vs CRED: SDE2 Salaries 2026 📊",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <h2 style="color: #0f172a;">Swiggy vs Swiggy vs Razorpay vs CRED: Who pays more? 📊</h2>
        <p>Hi there,</p>
        <p>As promised, here is your day-3 real-world salary intelligence breakdown for Senior Software Engineers (SDE2) in India.</p>
        <p>Swiggy, Swiggy, Razorpay, and CRED represent some of the highest-paying engineering organizations in the country. Here is exactly what their packages look like in 2026:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px; text-align: left;">Company</th>
            <th style="padding: 10px; text-align: left;">Base Salary</th>
            <th style="padding: 10px; text-align: left;">Stocks / ESOPs</th>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #4f46e5;">Swiggy</td>
            <td style="padding: 10px;">₹32L - ₹42L</td>
            <td style="padding: 10px;">₹12L - ₹18L / yr (RSUs)</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #4f46e5;">Swiggy (Instamart)</td>
            <td style="padding: 10px;">₹34L - ₹44L</td>
            <td style="padding: 10px;">₹14L - ₹20L / yr</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #4f46e5;">Razorpay</td>
            <td style="padding: 10px;">₹35L - ₹45L</td>
            <td style="padding: 10px;">₹15L - ₹22L / yr (ESOPs)</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #4f46e5;">CRED</td>
            <td style="padding: 10px;">₹38L - ₹48L</td>
            <td style="padding: 10px;">₹18L - ₹25L / yr</td>
          </tr>
        </table>

        <p>Knowing these numbers before your first recruiter call is the difference between locking in a standard ₹30L hike or a life-changing ₹48L compensation package.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.AUTH_URL || "http://localhost:3000"}/login?email=${encodeURIComponent(email)}" style="background-color: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Explore Full Salary Benchmarks →</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Next email: How three engineers negotiated ₹8L+ salary increases using this exact intelligence.</p>
      </div>
    `
  }),
  3: (email: string) => ({
    subject: "Negotiation Blueprint: How 3 engineers won ₹8L+ hikes 💰",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <h2 style="color: #0f172a;">How to win ₹8L+ more during negotiation 💰</h2>
        <p>Hi there,</p>
        <p>Negotiation isn't a battle of wills; it's a battle of data. Here are three real stories of Indian tech engineers who secured massive pay hikes using CareerOS salary data:</p>
        
        <ul style="padding-left: 20px; margin: 20px 0; line-height: 1.6;">
          <li style="margin-bottom: 15px;">
            <strong>Apurva (SDE2) Swiggy:</strong> 
            Apurva used our verified Swiggy bands to push back on a "final" base offer of ₹28L. By presenting clear competitor base rates, she secured ₹36L base — a ₹8L instant increase.
          </li>
          <li style="margin-bottom: 15px;">
            <strong>Rahul (Frontend Lead) Swiggy:</strong> 
            Rahul was offered ₹38L base. By leveraging Swiggy stock grant trends to calculate a target equity band, he successfully added ₹10L base and doubled his signing bonus.
          </li>
          <li style="margin-bottom: 15px;">
            <strong>Simran (Backend SDE3) Swiggy:</strong> 
            Using CareerOS's real-time comparison engine during an active loop, she obtained multiple competing bids, resulting in a ₹12L premium on her original Swiggy offer.
          </li>
        </ul>

        <p>You can unlock our complete negotiation academy, scripts, and comparative analysis tool with a free account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.AUTH_URL || "http://localhost:3000"}/login?email=${encodeURIComponent(email)}" style="background-color: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Claim Your Negotiation Blueprint →</a>
        </div>
      </div>
    `
  }),
  4: (email: string) => ({
    subject: "Final Notice: Claim your saved CareerOS workspace ⏳",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <h2 style="color: #0f172a;">Your temporary results workspace is expiring ⏳</h2>
        <p>Hi there,</p>
        <p>Two weeks ago, you used CareerOS to unlock high-value ATS optimization and salary data.</p>
        <p>Your guest data and saved results will be removed soon to free up workspace servers. Claim your permanent free account today to preserve your calculations and continue using our platform forever.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #4f46e5;">What's included in your free account:</p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; line-height: 1.5;">
            <li>Unlimited resume scores and ATS keywords scans</li>
            <li>Full compensation roadmap access for Swiggy, Swiggy, Razorpay, CRED</li>
            <li>Digital professional Twin learning mode</li>
            <li>Outreach auto-generation & tracking</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.AUTH_URL || "http://localhost:3000"}/login?email=${encodeURIComponent(email)}" style="background-color: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Claim My Free Account Now →</a>
        </div>
      </div>
    `
  })
};

// Initialize worker singleton in non-blocking way
let dripWorker: Worker | undefined;

export function startEmailCaptureWorker() {
  if (dripWorker) return;

  const connection = createRedisConnection();
  dripWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { emailCaptureId, email, step } = job.data;
      console.log(`[DRIP] Processing email drip step ${step} for ${email} (${emailCaptureId})`);

      // Verify that user hasn't converted yet
      const capture = await prisma.emailCapture.findUnique({
        where: { id: emailCaptureId },
      });

      if (!capture) {
        console.warn(`[DRIP] Email capture record ${emailCaptureId} not found. Skipping.`);
        return;
      }

      if (capture.convertedAt || capture.userId) {
        console.log(`[DRIP] User ${email} already converted. Skipping scheduled email step ${step}.`);
        return;
      }

      // Get email template
      const builder = dripEmails[step];
      if (!builder) {
        console.warn(`[DRIP] No email builder found for step ${step}. Skipping.`);
        return;
      }

      const { subject, html } = builder(email);
      await sendEmail({
        to: email,
        subject,
        html,
      });

      console.info(`[DRIP] Successfully sent drip step ${step} to ${email}`);
    },
    {
      connection,
      concurrency: 2,
    }
  );

  dripWorker.on("failed", (job, err) => {
    console.error(`[DRIP] Job failed for ${job?.id}:`, err);
  });

  console.info(`[DRIP] Email capture worker initialized and listening on "${QUEUE_NAME}"`);
}
