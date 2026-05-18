import type { SubscriptionPlan } from "@prisma/client";
import { requireUser, type AuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { meetsPlan } from "@/lib/subscription/plans";

export class CoachPaywallError extends Error {
  readonly code = "SUBSCRIPTION_REQUIRED" as const;
  readonly status = 402 as const;
  readonly upgradeUrl = "/settings";

  constructor() {
    super("Upgrade to Pro to unlock your AI career coach.");
    this.name = "CoachPaywallError";
  }
}

export type ProUser = AuthenticatedUser & { plan: SubscriptionPlan };

export async function requirePro(minPlan: "pro" | "enterprise" = "pro"): Promise<ProUser> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });

  if (!meetsPlan(row?.plan, minPlan)) {
    throw new CoachPaywallError();
  }

  return { ...user, plan: row?.plan ?? "free" };
}

export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return row?.plan ?? "free";
}
