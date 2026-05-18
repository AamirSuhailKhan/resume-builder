import { getString } from "@/app/api/interview/_lib/claude";

export type SearchItem = {
  query: string;
  title: string;
  summary: string;
  url?: string | undefined;
};

export async function duckDuckGoSearch(query: string): Promise<SearchItem[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return [];

  const items: SearchItem[] = [];
  const abstract = getString(payload.AbstractText);
  if (abstract) {
    items.push({
      query,
      title: getString(payload.Heading) || query,
      summary: abstract,
      url: getString(payload.AbstractURL) || undefined,
    });
  }

  const related = Array.isArray(payload.RelatedTopics) ? payload.RelatedTopics : [];
  for (const item of related.slice(0, 4)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const text = getString(record.Text);
    if (!text) continue;
    items.push({
      query,
      title: text.split(" - ")[0] || query,
      summary: text,
      url: getString(record.FirstURL) || undefined,
    });
  }

  return items;
}
