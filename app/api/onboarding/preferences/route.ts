import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const preferencesSchema = z.object({
  roles: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  locations: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  remote: z.boolean().default(true),
  jobTypes: z.array(z.enum(["full-time", "contract", "internship", "part-time"])).max(4).default(["full-time"]),
  minSalary: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
  notes: z.string().trim().max(1200).optional(),
  autonomyMode: z.enum(["manual", "assistive", "auto"]).default("manual"),
});

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

function salaryExpectation(minSalary: number | null | undefined): Prisma.InputJsonObject | undefined {
  if (minSalary === null || minSalary === undefined) return undefined;
  return {
    min: minSalary,
    currency: "USD",
    cadence: "annual",
  };
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = preferencesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid onboarding preferences." }, { status: 400 });
  }

  const existing = await prisma.careerProfile.findUnique({
    where: { userId },
    select: { autonomyPolicy: true },
  });
  const existingPolicy = jsonObject(existing?.autonomyPolicy);
  const salary = salaryExpectation(parsed.data.minSalary);
  const createData: Prisma.CareerProfileUncheckedCreateInput = {
    userId,
    goals: {
      targetRoles: parsed.data.roles,
      onboardingComplete: true,
    },
    preferences: {
      roles: parsed.data.roles,
      locations: parsed.data.locations,
      remote: parsed.data.remote,
      jobTypes: parsed.data.jobTypes,
      notes: parsed.data.notes ?? "",
    },
    constraints: {
      remote: parsed.data.remote,
      locations: parsed.data.locations,
    },
    autonomyPolicy: {
      mode: parsed.data.autonomyMode,
      onboardingComplete: true,
      onboardingSkipped: false,
      maxApplicationsPerDay: parsed.data.autonomyMode === "auto" ? 5 : 0,
      approvalRequiredFor: [
        "application_submit",
        "recruiter_message",
        "sensitive_form_field",
        "salary_expectation",
      ],
    },
  };
  const updateData: Prisma.CareerProfileUncheckedUpdateInput = {
    goals: {
      targetRoles: parsed.data.roles,
      onboardingComplete: true,
    },
    preferences: {
      roles: parsed.data.roles,
      locations: parsed.data.locations,
      remote: parsed.data.remote,
      jobTypes: parsed.data.jobTypes,
      notes: parsed.data.notes ?? "",
    },
    constraints: {
      remote: parsed.data.remote,
      locations: parsed.data.locations,
    },
    autonomyPolicy: {
      ...existingPolicy,
      mode: parsed.data.autonomyMode,
      onboardingComplete: true,
      onboardingSkipped: false,
      maxApplicationsPerDay:
        parsed.data.autonomyMode === "auto"
          ? Number(existingPolicy.maxApplicationsPerDay ?? 5)
          : Number(existingPolicy.maxApplicationsPerDay ?? 0),
    },
  };

  if (salary) {
    createData.salaryExpectation = salary;
    updateData.salaryExpectation = salary;
  }

  const profile = await prisma.careerProfile.upsert({
    where: { userId },
    create: createData,
    update: updateData,
  });

  const response = NextResponse.json({ data: profile, error: null });
  onboardingCookie(response);
  return response;
}
