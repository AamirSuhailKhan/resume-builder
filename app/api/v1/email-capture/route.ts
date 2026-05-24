import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/mailer";
import { getWelcomeEmailHtml } from "@/emails/WelcomeCapture";
import { scheduleEmailSequence, startEmailCaptureWorker } from "@/lib/queue/email-capture-queue";

const captureSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").min(5).max(254),
  source: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Initialize the drip worker once when this API is hit
try {
  startEmailCaptureWorker();
} catch (e) {
  console.error("[MAILER-QUEUE] Worker initialization failed:", e);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = captureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload details", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, source, metadata } = parsed.data;

    // Check if user already exists
    const existing = await prisma.emailCapture.findUnique({
      where: { email },
    });

    const alreadyExists = !!existing;

    // Upsert EmailCapture record
    const record = await prisma.emailCapture.upsert({
      where: { email },
      update: {
        source,
        metadata: metadata ?? {},
      },
      create: {
        email,
        source,
        metadata: metadata ?? {},
      },
    });

    // 1. Send Welcome Email Immediately
    const subject = "Your CareerOS results are saved 🎯";
    const html = getWelcomeEmailHtml(source, {
      ...metadata,
      email,
    });

    try {
      await sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (emailError) {
      console.error("[MAILER] Welcome email sending failed:", emailError);
      // We still want to return success because the capture succeeded
    }

    // 2. Schedule Day 3, 7, 14 Follow-up drip sequence using BullMQ
    try {
      await scheduleEmailSequence(record.id, email);
    } catch (queueError) {
      console.error("[QUEUE] Failed to schedule drip emails sequence:", queueError);
    }

    return NextResponse.json({
      success: true,
      alreadyExists,
      id: record.id,
      email: record.email,
    });
  } catch (error: any) {
    console.error("[EMAIL CAPTURE API] Failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during capture" },
      { status: 500 }
    );
  }
}
