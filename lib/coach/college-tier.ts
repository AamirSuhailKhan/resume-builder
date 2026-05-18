import type { CollegeTierResult } from "@/lib/coach/types";

const TIER1_KEYWORDS = [
  "iit", "indian institute of technology",
  "iim", "indian institute of management",
  "bits pilani", "bits goa", "bits hyderabad",
  "nit ", "national institute of technology",
  "iiit", "indian institute of information technology",
  "stanford", "mit", "harvard", "berkeley", "caltech", "cmu", "carnegie mellon",
  "oxford", "cambridge",
];

const TIER2_KEYWORDS = [
  "vit", "vellore institute",
  "srm", "manipal", "thapar", "dtu", "nsit", "dce",
  "symbiosis", "christ university", "amity", "lpu",
  "state university", "anna university", "jadavpur", "jadavpur university",
  "delhi university", "du ", "mumbai university",
];

function normalizeSchool(name: string): string {
  return name.trim().toLowerCase();
}

function classifySchool(school: string): "tier1" | "tier2" | "tier3" {
  const n = normalizeSchool(school);
  if (TIER1_KEYWORDS.some((k) => n.includes(k))) return "tier1";
  if (TIER2_KEYWORDS.some((k) => n.includes(k))) return "tier2";
  return "tier3";
}

export function inferCollegeTier(education: unknown): CollegeTierResult {
  const schools: string[] = [];

  if (Array.isArray(education)) {
    for (const entry of education) {
      if (entry && typeof entry === "object" && "school" in entry) {
        const school = String((entry as { school?: string }).school ?? "").trim();
        if (school) schools.push(school);
      }
    }
  } else if (typeof education === "string" && education.trim()) {
    schools.push(...education.split("\n").map((l) => l.trim()).filter(Boolean));
  }

  if (schools.length === 0) {
    return {
      tier: "unknown",
      schools: [],
      summary: "No education data on file — ask the user about their background before advising on college-tier barriers.",
    };
  }

  const tiers = schools.map(classifySchool);
  const bestTier = tiers.includes("tier1") ? "tier1" : tiers.includes("tier2") ? "tier2" : "tier3";

  const summaries: Record<CollegeTierResult["tier"], string> = {
    tier1: "Top-tier institute background — lean into alumni networks and high-bar companies.",
    tier2: "Strong regional/national college — focus on skills proof and referrals over brand.",
    tier3: "Non-brand college — emphasize projects, metrics, and startup/scale-up paths; avoid over-indexing on FAANG-only advice.",
    unknown: "",
  };

  return {
    tier: bestTier,
    schools,
    summary: summaries[bestTier],
  };
}
