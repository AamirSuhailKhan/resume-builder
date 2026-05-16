import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { callClaudeJson } from "@/app/api/interview/_lib/claude";
import { prisma } from "@/lib/db/prisma";
import { MilestoneService } from "@/lib/services/milestone.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().max(1000).optional(),
});

const moodLabels = ["terrible", "struggling", "okay", "good", "great"] as const;
const crisisKeywords = ["hopeless", "can't anymore", "cant anymore", "giving up on everything"];

function isoWeek(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: copy.getUTCFullYear() };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });

  const { mood, note } = parsed.data;
  const moodLabel = moodLabels[mood - 1] ?? "okay";
  const { week, year } = isoWeek(new Date());
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [appliedCount, responseCount] = await Promise.all([
    prisma.application.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.application.count({ where: { userId, createdAt: { gte: since }, status: { not: "applied" } } }),
  ]);

  let message = `${moodLabel === "terrible" || moodLabel === "struggling" ? "That sounds genuinely hard." : "This week has some real signal in it."} You sent ${appliedCount} application${appliedCount === 1 ? "" : "s"} and got ${responseCount} response${responseCount === 1 ? "" : "s"}. Pick one small action for the next session: improve one resume bullet, follow up once, or apply to one role that is clearly fresh.`;

  try {
    const { data } = await callClaudeJson<{ message: string }>({
      system: "You are a warm, supportive career coach. Return ONLY JSON with {\"message\":\"...\"}. Never be dismissive or toxic positive. Do not say 'I understand'.",
      user: JSON.stringify({
        moodLabel,
        note: note ?? "",
        recentActivity: { appliedCount, responseCount },
        instruction: "Write 3-4 sentences. Be real and include one specific actionable encouragement. Do not start with 'It'.",
      }),
      maxTokens: 300,
    });
    if (data.message) message = data.message;
  } catch {
    // Fallback message above.
  }

  const lowerNote = (note ?? "").toLowerCase();
  if (mood === 1 && crisisKeywords.some((keyword) => lowerNote.includes(keyword))) {
    message += " If you're going through something harder than job searching, talking to someone can help. iCall India: 9152987821.";
  }

  await prisma.wellbeingCheckIn.upsert({
    where: { userId_week_year: { userId, week, year } },
    create: { userId, mood, moodLabel, note: note ?? null, aiResponse: message, week, year },
    update: { mood, moodLabel, note: note ?? null, aiResponse: message },
  });

  const milestones = await MilestoneService.checkAndAwardMilestones(userId);
  return NextResponse.json({ message, milestones });
}
