import nodemailer from "nodemailer";

export function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost) {
    console.warn("[MAILER] SMTP host is not configured. Email sending will be simulated.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "CareerOS <noreply@careeros.in>";

  if (!transporter) {
    console.info(`[MAILER] [SIMULATION] Sending email to ${to}:
Subject: ${subject}
Content: ${html.substring(0, 150)}...`);
    return { messageId: "simulated-id" };
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || "Your CareerOS results are ready. Please open in an HTML-capable mail client.",
  });

  return info;
}
