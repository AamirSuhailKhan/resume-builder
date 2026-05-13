import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function onboardingCookie(response: NextResponse) {
  response.cookies.set("onboarding_complete", "true", {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const existing = await prisma.careerProfile.findUnique({
    where: { userId },
    select: { autonomyPolicy: true },
  });
  const existingPolicy = jsonObject(existing?.autonomyPolicy);

  const profile = await prisma.careerProfile.upsert({
    where: { userId },
    create: {
      userId,
      goals: {},
      preferences: {},
      constraints: {},
      autonomyPolicy: {
        mode: "manual",
        onboardingComplete: true,
        onboardingSkipped: true,
        maxApplicationsPerDay: 0,
        approvalRequiredFor: [
          "application_submit",
          "recruiter_message",
          "sensitive_form_field",
          "salary_expectation",
        ],
      } satisfies Prisma.InputJsonObject,
    },
    update: {
      autonomyPolicy: {
        ...existingPolicy,
        onboardingComplete: true,
        onboardingSkipped: true,
      } satisfies Prisma.InputJsonObject,
    },
  });

  const response = NextResponse.json({ data: profile, error: null });
  onboardingCookie(response);
  return response;
}
