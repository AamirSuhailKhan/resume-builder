import { prisma } from "@/lib/db/prisma";
import { JobOpportunity } from "@prisma/client";

export class JobsService {
  static async getOpportunitiesForUser(userId: string): Promise<JobOpportunity[]> {
    return prisma.jobOpportunity.findMany({
      where: { userId },
      orderBy: { matchScore: "desc" },
    });
  }

  static async getOpportunityById(id: string, userId: string): Promise<JobOpportunity | null> {
    return prisma.jobOpportunity.findFirst({
      where: { id, userId },
    });
  }

  static async deleteOpportunity(id: string, userId: string): Promise<void> {
    await prisma.jobOpportunity.delete({
      where: { id, userId },
    });
  }
}
