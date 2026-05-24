import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { trackConversion } from "@/lib/capture-analytics";

const PRELOADED_RESUME = {
  personal: {
    name: "Aditya Verma",
    email: "aditya.verma@domain.in",
    phone: "+91 98765 12345",
    location: "Bengaluru, India",
    summary: "Software Engineer with 3 years of hands-on experience building reactive web interfaces and backend services. Skilled in Python, React, and databases. Fast learner seeking growth opportunities.",
  },
  experience: [
    {
      id: "exp-1",
      company: "TechMobility India",
      role: "Software Developer",
      startDate: "2021-07",
      endDate: "Present",
      points: "Worked on frontend features for tracking customer fleets.\nCreated internal Python scripts to scrape transit data.\nCollaborated with frontend developers to migrate old sections."
    }
  ],
  education: [
    {
      id: "edu-1",
      school: "NIT Trichy",
      degree: "B.Tech in Electronics",
      year: "2021"
    }
  ],
  skills: ["Python", "React", "JavaScript", "HTML", "CSS", "SQL", "Git"],
  projects: [],
  customSections: [],
};

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  demo: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const { name, email, password, demo } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // Track lead conversion
    await trackConversion(email, user.id).catch((err) => {
      console.error("[REGISTER] Conversion tracking failed:", err);
    });

    // Seeding demo resume if demo=true is set
    if (demo) {
      const resume = await prisma.resume.create({
        data: {
          userId: user.id,
          title: "Razorpay SDE - Demo Resume",
          data: PRELOADED_RESUME,
          status: "completed",
          version: 1,
        },
      });

      // Update user's active resume to point to the newly seeded resume
      await prisma.user.update({
        where: { id: user.id },
        data: {
          activeResumeId: resume.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("[REGISTER API] Registration failed", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}
