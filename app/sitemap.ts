import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const SHOW_TWIN = false;
  const staticRoutes = ["", "/interview-ai", "/matches", ...(SHOW_TWIN ? ["/twin"] : [])].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/interview-ai" ? 0.95 : 0.7,
  }));

  return staticRoutes;
}
