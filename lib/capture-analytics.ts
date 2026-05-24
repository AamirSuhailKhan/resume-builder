import { prisma } from "@/lib/db/prisma";

export async function trackCapture(source: string, metadata: any = {}) {
  if (typeof window !== "undefined") {
    // Client-side: call the email-capture API and set localStorage
    const email = metadata.email;
    if (!email) return;

    try {
      const res = await fetch("/api/v1/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, metadata, email }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("email_captured", "true");
        localStorage.setItem("captured_email", email);
      }
      return data;
    } catch (error) {
      console.error("[ANALYTICS] Failed to track capture client-side:", error);
      return { success: false, error };
    }
  }
}

export async function trackConversion(email: string, userId: string) {
  if (typeof window === "undefined") {
    // Server-side
    try {
      const existing = await prisma.emailCapture.findUnique({
        where: { email },
      });
      if (existing) {
        await prisma.emailCapture.update({
          where: { email },
          data: {
            convertedAt: new Date(),
            userId: userId,
          },
        });
        console.log(`[ANALYTICS] Converted guest lead: ${email} -> ${userId}`);
      }
    } catch (error) {
      console.error("[ANALYTICS] Failed to track conversion server-side:", error);
    }
  } else {
    // Client-side fallback API call
    try {
      await fetch("/api/v1/email-capture/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId }),
      });
    } catch (error) {
      console.error("[ANALYTICS] Failed to track conversion client-side:", error);
    }
  }
}

export async function getCaptureRate() {
  if (typeof window !== "undefined") {
    throw new Error("getCaptureRate can only be called on the server");
  }

  try {
    const totalCaptured = await prisma.emailCapture.count();
    const totalConverted = await prisma.emailCapture.count({
      where: {
        convertedAt: { not: null },
      },
    });

    const rate = totalCaptured > 0 ? (totalConverted / totalCaptured) * 100 : 0;

    // Group by source stats
    const sources = await prisma.emailCapture.groupBy({
      by: ["source"],
      _count: {
        id: true,
      },
    });

    const convertedSources = await prisma.emailCapture.groupBy({
      by: ["source"],
      where: {
        convertedAt: { not: null },
      },
      _count: {
        id: true,
      },
    });

    const sourceStats = sources.map((s) => {
      const total = s._count.id;
      const convRecord = convertedSources.find((cs) => cs.source === s.source);
      const converted = convRecord ? convRecord._count.id : 0;
      return {
        source: s.source,
        total,
        converted,
        rate: total > 0 ? (converted / total) * 100 : 0,
      };
    });

    return {
      totalCaptured,
      totalConverted,
      overallRate: Number(rate.toFixed(2)),
      sourceStats,
    };
  } catch (error) {
    console.error("[ANALYTICS] Failed to compute capture rates:", error);
    return {
      totalCaptured: 0,
      totalConverted: 0,
      overallRate: 0,
      sourceStats: [],
    };
  }
}
