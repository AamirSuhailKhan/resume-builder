import type { SearchMilestone } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const milestoneRules = [
  { type: "first_application", label: "First application", test: (stats: Stats) => stats.totalApplied >= 1 },
  { type: "tenth_application", label: "Tenth application", test: (stats: Stats) => stats.totalApplied >= 10 },
  { type: "first_response", label: "First response", test: (stats: Stats) => stats.totalResponses >= 1 },
  { type: "first_interview", label: "First interview", test: (stats: Stats) => stats.totalInterviews >= 1 },
  { type: "offer_received", label: "Offer received", test: (stats: Stats) => stats.totalOffers >= 1 },
];

type Stats = {
  totalApplied: number;
  totalResponses: number;
  totalInterviews: number;
  totalOffers: number;
};

export class MilestoneService {
  static async checkAndAwardMilestones(userId: string): Promise<SearchMilestone[]> {
    const [totalApplied, totalResponses, totalInterviews, totalOffers] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: { not: "applied" } } }),
      prisma.application.count({ where: { userId, status: "interview" } }),
      prisma.application.count({ where: { userId, status: "offer" } }),
    ]);

    const stats = { totalApplied, totalResponses, totalInterviews, totalOffers };
    const created: SearchMilestone[] = [];

    for (const rule of milestoneRules) {
      if (!rule.test(stats)) continue;
      try {
        const milestone = await prisma.searchMilestone.create({
          data: { userId, type: rule.type },
        });
        created.push(milestone);
      } catch {
        // Unique constraint means already awarded.
      }
    }

    return created;
  }

  static label(type: string) {
    return milestoneRules.find((rule) => rule.type === type)?.label ?? "Milestone";
  }
}
