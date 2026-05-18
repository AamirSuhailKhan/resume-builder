import type { SubscriptionPlan } from "@prisma/client";

export const COACH_DAILY_LIMITS: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 50,
  enterprise: 200,
};

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export function meetsPlan(current: SubscriptionPlan | null | undefined, required: "pro" | "enterprise"): boolean {
  const rank = PLAN_RANK[current ?? "free"];
  return rank >= PLAN_RANK[required];
}

export function getCoachDailyLimit(plan: SubscriptionPlan | null | undefined): number {
  return COACH_DAILY_LIMITS[plan ?? "free"];
}
