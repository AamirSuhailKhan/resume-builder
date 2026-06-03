import { prisma } from "@/lib/db/prisma";

export interface ApplicationListItem {
  id: string;
  company: string;
  role: string;
  status: string;
  notes: string | null;
  matchScore: number | null;
  updatedAt: Date;
}

export class ApplicationService {
  static async getApplicationsForUser(userId: string): Promise<ApplicationListItem[]> {
    return prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      // Only select fields used by the tracker UI — avoids full jobOpportunity join
      select: {
        id: true,
        company: true,
        role: true,
        status: true,
        notes: true,
        matchScore: true,
        updatedAt: true,
      },
    });
  }

  static async updateApplicationStatus(id: string, userId: string, status: "applied" | "interview" | "rejected" | "offer") {
    return prisma.application.update({
      where: { id, userId },
      data: { status },
    });
  }

  static async deleteApplication(id: string, userId: string): Promise<void> {
    await prisma.application.delete({
      where: { id, userId },
    });
  }
}

