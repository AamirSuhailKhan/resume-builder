import "server-only";
import type { Prisma } from "@prisma/client";
import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { analyzeRejectionPatterns } from "@/lib/coach/rejection-patterns";
import type { StoredCoachMessage } from "@/lib/coach/types";
import { getCoachDailyLimit } from "@/lib/subscription/plans";

const DEMO_MESSAGES: StoredCoachMessage[] = [
  {
    id: "demo-1",
    role: "user",
    content: "Why am I getting rejected so much?",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    role: "assistant",
    content:
      "I've looked at your application history. You're applying to senior roles with a resume that reads mid-level — that's the mismatch. Your last 8 rejections cluster around product companies where they expect ownership metrics you haven't quantified yet.\n\n**Root cause:** Resume positioning, not talent.\n\n**This week:** Rewrite your top 3 bullets with metrics. Apply to 5 roles one level below your target to rebuild momentum.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    role: "user",
    content: "Should I apply to a startup or an MNC?",
    createdAt: new Date().toISOString(),
  },
];

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfUtcDay(): Date {
  const d = startOfUtcDay();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export class CoachService {
  static async listSessions(userId: string) {
    return prisma.coachSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        mode: true,
        updatedAt: true,
        createdAt: true,
        messages: true,
      },
    });
  }

  static async getSession(userId: string, sessionId: string) {
    return prisma.coachSession.findFirst({
      where: { id: sessionId, userId },
    });
  }

  static async createSession(userId: string, title = "New conversation") {
    return prisma.coachSession.create({
      data: { userId, title },
    });
  }

  static async updateSession(
    userId: string,
    sessionId: string,
    data: {
      title?: string;
      mode?: string;
      metadata?: Prisma.InputJsonValue | Record<string, unknown>;
      messages?: StoredCoachMessage[] | Prisma.InputJsonValue;
    }
  ) {
    const prismaData: Prisma.CoachSessionUpdateManyMutationInput = {};
    if (data.title !== undefined) prismaData.title = data.title;
    if (data.mode !== undefined) prismaData.mode = data.mode;
    if (data.metadata !== undefined) prismaData.metadata = data.metadata as Prisma.InputJsonValue;
    if (data.messages !== undefined) prismaData.messages = data.messages as Prisma.InputJsonValue;

    return prisma.coachSession.updateMany({
      where: { id: sessionId, userId },
      data: prismaData,
    });
  }

  static async deleteSession(userId: string, sessionId: string) {
    return prisma.coachSession.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  static async saveMessages(
    userId: string,
    sessionId: string,
    messages: StoredCoachMessage[],
    title?: string
  ) {
    const data: Prisma.CoachSessionUpdateManyMutationInput = {
      messages: messages as unknown as Prisma.InputJsonValue,
    };
    if (title) data.title = title;

    return prisma.coachSession.updateMany({
      where: { id: sessionId, userId },
      data,
    });
  }

  static async listNotes(userId: string) {
    return prisma.coachNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  static async saveNote(userId: string, content: string, sessionId?: string) {
    return prisma.coachNote.create({
      data: { userId, content, sessionId: sessionId ?? null },
    });
  }

  static async getUsage(userId: string, plan: SubscriptionPlan) {
    const limit = getCoachDailyLimit(plan);
    let usage = await prisma.coachUsage.findUnique({ where: { userId } });

    const dayStart = startOfUtcDay();
    if (!usage) {
      usage = await prisma.coachUsage.create({
        data: { userId, messagesUsedToday: 0, lastResetAt: dayStart },
      });
    } else if (usage.lastResetAt < dayStart) {
      usage = await prisma.coachUsage.update({
        where: { userId },
        data: { messagesUsedToday: 0, lastResetAt: dayStart },
      });
    }

    return {
      used: usage.messagesUsedToday,
      limit,
      resetsAt: endOfUtcDay().toISOString(),
    };
  }

  static async checkAndIncrementUsage(userId: string, plan: SubscriptionPlan): Promise<{ allowed: boolean; used: number; limit: number }> {
    const { used, limit } = await this.getUsage(userId, plan);
    if (used >= limit) {
      return { allowed: false, used, limit };
    }

    await prisma.coachUsage.update({
      where: { userId },
      data: { messagesUsedToday: { increment: 1 } },
    });

    return { allowed: true, used: used + 1, limit };
  }

  static async getTeaserForUser(userId: string) {
    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const analysis = analyzeRejectionPatterns(applications);

    let patternTeaser = "Your coach is ready to analyze your job search patterns.";
    if (analysis.rejectionsLast30Days > 0) {
      patternTeaser = `Based on your ${analysis.rejectionsLast30Days} rejection${analysis.rejectionsLast30Days === 1 ? "" : "s"} in the last 30 days, your coach has identified a pattern. Upgrade to see it.`;
      if (analysis.likelyCauses[0]) {
        patternTeaser += ` Hint: ${analysis.likelyCauses[0]}`;
      }
    }

    return {
      rejectionCount30d: analysis.rejectionsLast30Days,
      patternTeaser,
      demoMessages: DEMO_MESSAGES,
    };
  }
}
