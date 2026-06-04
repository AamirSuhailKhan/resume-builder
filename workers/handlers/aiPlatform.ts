import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AiAutoApplyPayload, AiJobIntelligencePayload, AiPortfolioPayload } from "@/lib/queue/types";
import { geminiJSON } from "@/lib/ai/core";
import { z } from "zod";


function extractTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringField(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" && entry.length > 0 ? entry : undefined;
}

export async function handleJobIntelligence(payload: AiJobIntelligencePayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  // Fetch the user's resume to compute a real skill match
  const resume = await prisma.resume.findFirst({
    where: { userId: payload.userId },
    orderBy: { updatedAt: "desc" },
    select: { data: true },
  });

  const resumeSkills: string[] = [];
  if (resume?.data && typeof resume.data === "object" && !Array.isArray(resume.data)) {
    const raw = resume.data as Record<string, unknown>;
    if (Array.isArray(raw.skills)) resumeSkills.push(...raw.skills.map(String));
  }

  // Use Gemini to extract structured data from the real JD
  let parsed;

  const JobIntelligenceOutputSchema = z.object({
    role: z.string(),
    company: z.string(),
    skills: z.array(z.string()),
    tools: z.array(z.string()),
    experience: z.array(z.string()),
    missingSkills: z.array(z.string()),
  });

  const fallback = {
    role: "Senior Frontend Engineer",
    company: "Google",
    skills: ["React", "Next.js", "TypeScript", "TailwindCSS"],
    tools: ["PostgreSQL", "Zustand"],
    experience: ["Building frontend apps"],
    missingSkills: ["GraphQL"],
  };

  try {
    const aiResult = await geminiJSON({
      system: `Analyze this job description and return ONLY a JSON object:
{
  "role": "exact job title from the description",
  "company": "company name or 'Unknown Company' if not stated",
  "skills": ["required technical skills and programming languages"],
  "tools": ["mentioned tools, frameworks, platforms"],
  "experience": ["key experience requirements as short phrases"],
  "missingSkills": ["skills NOT present in this candidate's resume but required by the JD"]
}

Candidate's current skills: ${resumeSkills.join(", ") || "None provided"}`,
      user: `Job Description:
${payload.jobDescription.substring(0, 6000)}`,
      schema: JobIntelligenceOutputSchema,
      fallback,
    });

    const skills = Array.isArray(aiResult.skills) ? aiResult.skills.map(String) : [];
    const tools = Array.isArray(aiResult.tools) ? aiResult.tools.map(String) : [];
    const missingSkills = Array.isArray(aiResult.missingSkills) ? aiResult.missingSkills.map(String) : [];
    const experience = Array.isArray(aiResult.experience) ? aiResult.experience.map(String) : [];

    // Compute real match score based on actual resume vs JD skills
    const allRequired = [...skills, ...tools];
    const matched = allRequired.filter((s) =>
      resumeSkills.some((r) => r.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(r.toLowerCase()))
    );
    const matchScore = allRequired.length > 0
      ? Math.round(Math.min(100, Math.max(20, (matched.length / allRequired.length) * 100)))
      : 0;

    parsed = {
      role: aiResult.role || "Target Role",
      company: aiResult.company || "Unknown Company",
      skills,
      tools,
      experience,
      missingSkills,
      matchScore,
    };
  } catch (err) {
    // Non-fatal: mark as failed if AI parse completely fails
    await prisma.job.update({
      where: { id: payload.jobRecordId },
      data: { status: "failed", lastError: err instanceof Error ? err.message : "AI parsing failed" },
    });
    throw err;
  }

  const result = {
    skills: parsed.skills,
    tools: parsed.tools,
    experience: parsed.experience,
    missingSkills: parsed.missingSkills,
    matchScore: parsed.matchScore,
    schemaVersion: "job-intelligence.v2",
  };

  const opportunity = await prisma.jobOpportunity.create({
    data: {
      userId: payload.userId,
      company: parsed.company,
      role: parsed.role,
      description: payload.jobDescription,
      matchScore: parsed.matchScore,
      parsed: {
        ...result,
        skills: parsed.skills,
        missing: parsed.missingSkills,
        source: "user_paste",
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: { ...payload, result, jobOpportunityId: opportunity.id } as Prisma.InputJsonValue,
    },
  });

  return result;
}


export async function handleAutoApply(payload: AiAutoApplyPayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  // Resolve real company/role/matchScore from the linked opportunity record
  const opportunity = payload.jobOpportunityId
    ? await prisma.jobOpportunity.findUnique({
        where: { id: payload.jobOpportunityId },
        select: { company: true, role: true, matchScore: true },
      })
    : null;

  if (!opportunity) {
    await prisma.job.update({
      where: { id: payload.jobRecordId },
      data: {
        status: "failed",
        lastError: "jobOpportunityId is missing or the linked opportunity does not exist.",
      },
    });
    throw new Error("AutoApply: no linked JobOpportunity — cannot create application without real job data.");
  }

  const application = await prisma.application.create({
    data: {
      userId: payload.userId,
      resumeId: payload.resumeId ?? null,
      jobOpportunityId: payload.jobOpportunityId ?? null,
      company: opportunity.company,
      role: opportunity.role,
      matchScore: opportunity.matchScore,
      generatedResume: payload.preview ?? null,
      coverLetter: null,
      emailDraft: null,
      appliedAt: new Date(),
    },
  });

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: { ...payload, applicationId: application.id } as Prisma.InputJsonValue,
    },
  });

  return { applicationId: application.id };
}

export async function handlePortfolio(payload: AiPortfolioPayload) {
  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: { status: "processing", attempts: { increment: 1 }, lastError: null },
  });

  const result = {
    theme: payload.theme,
    draftUrl: "https://aamir.resumeai.site",
    sections: ["Hero", "Projects", "Proof", "Contact"],
    schemaVersion: "portfolio.v1",
  };

  await prisma.job.update({
    where: { id: payload.jobRecordId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: { ...payload, result } as Prisma.InputJsonValue,
    },
  });

  return result;
}
