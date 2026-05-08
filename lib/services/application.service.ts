import { prisma } from "@/lib/db/prisma";
import { Application } from "@prisma/client";

export class ApplicationService {
  static async getApplicationsForUser(userId: string): Promise<Application[]> {
    return prisma.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        jobOpportunity: true,
      }
    });
  }

  static async updateApplicationStatus(id: string, userId: string, status: "applied" | "interview" | "rejected" | "offer"): Promise<Application> {
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
