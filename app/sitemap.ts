import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/interview-intelligence/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const companies = await prisma.company.findMany({
    orderBy: { trustScore: "desc" },
    take: 5000,
    include: { roles: { take: 5 } },
  }).catch(() => []);

  const SHOW_TWIN = false;
  const staticRoutes = ["", "/interview", "/matches", ...(SHOW_TWIN ? ["/twin"] : [])].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/interview" ? 0.95 : 0.7,
  }));

  const interviewRoutes = companies.flatMap((company) => {
    const roles = company.roles.length ? company.roles : [{ title: "software engineer" }];
    return roles.map((role) => ({
      url: `${baseUrl}/interview/${slugify(`${company.name} ${role.title} interview questions`)}`,
      lastModified: company.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  });

  return [...staticRoutes, ...interviewRoutes];
}
