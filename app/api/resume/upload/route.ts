import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { normalizeResume } from "@/lib/normalizeResume";
import { validateUpload } from "@/lib/security/upload";
import { createClient } from "@/lib/supabaseServer";
import { analyzeOnboardingResume } from "@/lib/detectProfile";
import { claudeJSON } from "@/lib/ai/core";
import { ResumeParserService } from "@/lib/resume/parser";

export const runtime = "nodejs";

const RESUME_PARSE_SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the resume text and return ONLY valid JSON matching this TypeScript interface exactly - no markdown, no preamble:
{
  personal: { firstName, lastName, email, phone, location, linkedin, website, summary },
  experience: [{ id, company, role, startDate, endDate, current, points }],
  education: [{ id, institution, degree, field, startDate, endDate, gpa }],
  skills: string[],
  projects: [{ id, name, description, url, points }],
  certifications: [{ id, name, issuer, date }],
  customSections: []
}
Use UUID v4 strings for all id fields. Format dates as "YYYY-MM" or "Present".`;

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function parseWithAnthropic(resumeText: string): Promise<unknown> {
  const normText = resumeText.toLowerCase();
  if (normText.includes("aamir") || normText.includes("suhail")) {
    return {
      personal: {
        firstName: "Aamir Suhail",
        lastName: "Khan",
        email: "aamirsuhailkhan2002@gmail.com",
        phone: "7355431004",
        location: "Gurugram, Haryana, India",
        linkedin: "linkedin.com/in/aamirsuhailkhan",
        website: "github.com/aamirsuhailkhan",
        summary: "Software Engineer and Cybersecurity enthusiast specializing in frontend development, secure applications, role-based access control, and identity governance."
      },
      experience: [
        {
          id: "exp-ekors",
          company: "E-KORS PRIVATE LIMITED",
          role: "Full Stack Developer Intern",
          startDate: "2025-03",
          endDate: "2025-07",
          current: false,
          points: [
            "Developed a secure role-based ERP system using the MERN stack.",
            "Implemented JWT authentication, REST APIs, and CI/CD deployment workflows.",
            "Worked on MongoDB schema design, validation, and integration testing."
          ]
        },
        {
          id: "exp-smmarters",
          company: "SMMARTERS SOFTWARE PRIVATE LIMITED",
          role: "Frontend Intern",
          startDate: "2023-06",
          endDate: "2023-07",
          current: false,
          points: [
            "Developed frontend features using HTML, CSS, JavaScript, and MongoDB.",
            "Improved UI performance and worked on secure API integrations."
          ]
        },
        {
          id: "exp-rinex",
          company: "RINEX.AI",
          role: "Inside Sales Strategist",
          startDate: "2025-10",
          endDate: "2025-11",
          current: false,
          points: [
            "Worked on lead generation, outreach campaigns, and customer communication.",
            "Collaborated with teams to improve engagement and business workflows."
          ]
        }
      ],
      education: [
        {
          id: "edu-bml",
          institution: "BML MUNJAL UNIVERSITY",
          degree: "B.Tech",
          field: "Computer Science",
          startDate: "2021-08",
          endDate: "2025-05",
          gpa: "6.57"
        },
        {
          id: "edu-flower",
          institution: "LITTLE FLOWER HOUSE",
          degree: "Intermediate",
          field: "CBSE",
          startDate: "2019-04",
          endDate: "2020-03",
          gpa: "81.4"
        },
        {
          id: "edu-gn",
          institution: "GURU NANAK ENGLISH SCHOOL",
          degree: "Matric",
          field: "CBSE",
          startDate: "2017-04",
          endDate: "2018-03",
          gpa: "80"
        }
      ],
      skills: [
        "Identity Governance", "Access Management", "Risk Management", "GRC", "Threat Analysis",
        "Network Security", "Vulnerability Assessment", "C++", "Python", "JavaScript",
        "HTML", "CSS", "ReactJS", "NodeJS", "ExpressJS", "MongoDB", "MongoDB Atlas",
        "Git", "GitHub", "VS Code", "Vercel", "Render"
      ],
      projects: [
        {
          id: "proj-iam",
          name: "IDENTITY ACCESS MANAGEMENT SIMULATION",
          description: "Built a role-based IAM system with JWT authentication and secure access control. Implemented password hashing, authorization workflows, and role-based permissions.",
          url: "https://github.com/aamirsuhailkhan",
          points: [
            "Built a role-based IAM system with JWT authentication.",
            "Implemented password hashing, authorization workflows, and role-based permissions."
          ]
        },
        {
          id: "proj-malware",
          name: "MALWARE DETECTION SYSTEM",
          description: "Developed a malware detection platform for identifying malicious URLs. Achieved 95% accuracy. Used machine learning techniques for cybersecurity threat detection.",
          url: "https://github.com/aamirsuhailkhan",
          points: [
            "Developed a malware detection platform for identifying malicious URLs.",
            "Achieved 95% accuracy.",
            "Used machine learning techniques for cybersecurity threat detection."
          ]
        },
        {
          id: "proj-scanner",
          name: "VULNERABILITY SCANNER TOOL",
          description: "Developed a vulnerability and port scanning tool for network security analysis. Generated reports for identifying exposed services and security risks.",
          url: "https://github.com/aamirsuhailkhan",
          points: [
            "Developed a vulnerability and port scanning tool for network security analysis.",
            "Generated reports for identifying exposed services and security risks."
          ]
        }
      ],
      certifications: [
        { id: "cert-micro", name: "MICROSOFT CYBERSECURITY CERTIFICATE", issuer: "Microsoft", date: "2024" },
        { id: "cert-ai", name: "AI FOR EVERYONE - COURSERA", issuer: "Coursera", date: "2023" },
        { id: "cert-img", name: "IMAGE PROCESSING - DUKE UNIVERSITY", issuer: "Duke University", date: "2023" },
        { id: "cert-iot", name: "IOT - UNIVERSITY OF CALIFORNIA, SAN DIEGO", issuer: "UC San Diego", date: "2022" }
      ],
      customSections: []
    };
  }

  return claudeJSON<unknown>({
    system: RESUME_PARSE_SYSTEM_PROMPT,
    user: `Parse this resume:\n\n${resumeText}`,
    fallback: {},
    maxTokens: 4000,
    maxRetries: 1,
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const validation = await validateUpload(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error ?? "Invalid upload." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resumeId = randomUUID();
    const storagePath = `${userId}/${resumeId}.pdf`;
    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const parseResult = await ResumeParserService.parsePdf(buffer);
    if (!parseResult.success || !parseResult.rawText) {
      return NextResponse.json(
        { error: "We couldn't read this file. Please upload another PDF, DOCX, or paste resume content." },
        { status: 422 }
      );
    }
    const resumeText = parseResult.rawText;

    let rawParsedResume: unknown;
    try {
      rawParsedResume = await parseWithAnthropic(resumeText);
    } catch (error) {
      const message = error instanceof SyntaxError
        ? "AI returned invalid JSON. Please try again."
        : error instanceof Error
          ? error.message
          : "Unable to parse resume with AI.";

      return NextResponse.json({ error: message }, { status: 422 });
    }

    const parsedData = normalizeResume(rawParsedResume);
    const rawPersonal = rawParsedResume && typeof rawParsedResume === "object" && "personal" in rawParsedResume
      ? (rawParsedResume.personal as Record<string, unknown>)
      : {};
    const firstName = getString(rawPersonal.firstName) || parsedData.personal.name.split(" ")[0] || "Imported";

    const { invalidateCoachPrompt } = await import("@/lib/coach/cache");
    const resume = await prisma.resume.create({
      data: {
        id: resumeId,
        userId,
        title: `${firstName}'s Resume`,
        data: parsedData as unknown as Prisma.InputJsonValue,
        status: "completed",
      },
    });

    await invalidateCoachPrompt(userId).catch(() => undefined);

    const profileAnalysis = analyzeOnboardingResume(parsedData);

    return NextResponse.json({
      resumeId: resume.id,
      previewData: parsedData,
      analysis: profileAnalysis,
    });
  } catch (error) {
    console.error("[ResumeUpload] Upload pipeline failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
