import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiError } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const userId = session.user.id;

  const resume = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const data = (resume?.data ?? {}) as Record<string, unknown>;
  const personal = (data.personal ?? data.personalInfo ?? {}) as Record<string, unknown>;
  const contact = (data.contact ?? {}) as Record<string, unknown>;
  const links = (data.links ?? data.profiles ?? {}) as Record<string, unknown>;

  const skills: string[] = [];
  if (Array.isArray(data.skills)) {
    for (const s of data.skills) {
      if (typeof s === "string") skills.push(s);
      else if (typeof s === "object" && s !== null && "name" in s) skills.push(String((s as { name: unknown }).name));
    }
  }

  return apiOk({
    firstName: String(personal.firstName ?? personal.first_name ?? ""),
    lastName: String(personal.lastName ?? personal.last_name ?? ""),
    email: session.user.email ?? String(contact.email ?? ""),
    phone: String(personal.phone ?? contact.phone ?? ""),
    linkedin: String(links.linkedin ?? links.linkedinUrl ?? ""),
    github: String(links.github ?? links.githubUrl ?? ""),
    portfolio: String(links.portfolio ?? links.website ?? links.portfolioUrl ?? ""),
    location: String(personal.location ?? personal.city ?? ""),
    skills,
    currentRole: String(personal.title ?? personal.headline ?? personal.currentRole ?? ""),
  });
}
