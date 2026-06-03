import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export interface CreateRecruiterInput {
  userId: string;
  name: string;
  email?: string | null | undefined;
  linkedinUrl?: string | null | undefined;
  companyName: string;
  title?: string | null | undefined;
  roleFamily?: string | undefined;
  notes?: string | null | undefined;
}

export interface CreateRecruiterInteractionInput {
  recruiterId: string;
  type: "INMAIL" | "EMAIL" | "LINKEDIN_CONNECT" | "PHONE_SCREEN" | "INTERVIEW_SCHEDULED";
  status: "SENT" | "REPLIED" | "GHOSTED" | "NO_INTEREST";
  responseTimeDays?: number | null | undefined;
  notes?: string | null | undefined;
  date?: Date | undefined;
}

export class RecruiterService {
  /**
   * Create a new recruiter record
   */
  static async createRecruiter(input: CreateRecruiterInput) {
    try {
      const recruiter = await prisma.recruiter.create({
        data: {
          userId: input.userId,
          name: input.name,
          email: input.email ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          companyName: input.companyName,
          title: input.title ?? null,
          roleFamily: input.roleFamily ?? "Engineering",
          notes: input.notes ?? null,
          responseScore: 50.0,
          ghostingRate: 0.3,
          avgResponseDays: 3.0,
          engagementScore: 50.0,
          status: "ACTIVE"
        }
      });
      return recruiter;
    } catch (error) {
      logger.error({ error, name: input.name }, "Failed to create recruiter");
      throw error;
    }
  }

  /**
   * List recruiters with optional filters
   */
  static async getRecruiters(userId: string, filters?: { companyName?: string; roleFamily?: string }) {
    try {
      const where: any = { userId };
      if (filters?.companyName) {
        where.companyName = { contains: filters.companyName, mode: "insensitive" };
      }
      if (filters?.roleFamily) {
        where.roleFamily = filters.roleFamily;
      }

      return await prisma.recruiter.findMany({
        where,
        include: {
          interactions: {
            orderBy: { date: "desc" }
          }
        },
        orderBy: { engagementScore: "desc" }
      });
    } catch (error) {
      logger.error({ error, userId }, "Failed to get recruiters");
      throw error;
    }
  }

  /**
   * Update recruiter details
   */
  static async updateRecruiter(recruiterId: string, data: Partial<Omit<CreateRecruiterInput, "userId">> & { status?: string; notes?: string | null }) {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
      if (data.companyName !== undefined) updateData.companyName = data.companyName;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.roleFamily !== undefined) updateData.roleFamily = data.roleFamily;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const recruiter = await prisma.recruiter.update({
        where: { id: recruiterId },
        data: updateData
      });

      await this.recalculateRecruiterScores(recruiterId);
      return recruiter;
    } catch (error) {
      logger.error({ error, recruiterId }, "Failed to update recruiter");
      throw error;
    }
  }

  /**
   * Delete a recruiter
   */
  static async deleteRecruiter(recruiterId: string) {
    try {
      return await prisma.recruiter.delete({
        where: { id: recruiterId }
      });
    } catch (error) {
      logger.error({ error, recruiterId }, "Failed to delete recruiter");
      throw error;
    }
  }

  /**
   * Log outreach/activity with a recruiter
   */
  static async logInteraction(input: CreateRecruiterInteractionInput) {
    try {
      const interaction = await prisma.recruiterContactInteraction.create({
        data: {
          recruiterId: input.recruiterId,
          type: input.type,
          status: input.status,
          responseTimeDays: input.responseTimeDays ?? null,
          notes: input.notes ?? null,
          date: input.date ?? new Date()
        }
      });

      // Recalculate scores and status based on interactions
      await this.recalculateRecruiterScores(input.recruiterId);

      return interaction;
    } catch (error) {
      logger.error({ error, recruiterId: input.recruiterId }, "Failed to log recruiter interaction");
      throw error;
    }
  }

  /**
   * Recommend recruiters matching a targeted role title
   */
  static async getMatchingRecruiters(userId: string, jobTitle: string) {
    try {
      const recruiters = await this.getRecruiters(userId);
      const titleLower = jobTitle.toLowerCase();
      
      let targetFamily = "Engineering";
      if (titleLower.includes("product") || titleLower.includes("pm")) {
        targetFamily = "Product";
      } else if (titleLower.includes("design") || titleLower.includes("ux") || titleLower.includes("ui")) {
        targetFamily = "Design";
      } else if (titleLower.includes("sales") || titleLower.includes("marketing") || titleLower.includes("biz") || titleLower.includes("recruit")) {
        targetFamily = "Business";
      }

      // Filter and rank based on roleFamily and engagementScore
      return recruiters
        .map(recruiter => {
          let matchScore = recruiter.engagementScore;
          if (recruiter.roleFamily === targetFamily) {
            matchScore += 20; // bonus for matching role domain
          }
          return {
            recruiter,
            matchScore: Math.min(100, matchScore)
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      logger.error({ error, userId, jobTitle }, "Failed to match recruiters");
      throw error;
    }
  }

  /**
   * Internal method to calculate response scores, ghosting rates, and engagement prediction
   */
  private static async recalculateRecruiterScores(recruiterId: string) {
    const recruiter = await prisma.recruiter.findUnique({
      where: { id: recruiterId },
      include: { interactions: true }
    });
    if (!recruiter) return;

    const interactions = recruiter.interactions;
    if (interactions.length === 0) {
      // Default fallback scores
      await prisma.recruiter.update({
        where: { id: recruiterId },
        data: {
          responseScore: 50.0,
          ghostingRate: 0.3,
          avgResponseDays: 3.0,
          engagementScore: 50.0
        }
      });
      return;
    }

    const total = interactions.length;
    const replied = interactions.filter(i => i.status === "REPLIED" || i.status === "INTERVIEW_SCHEDULED").length;
    const ghosted = interactions.filter(i => i.status === "GHOSTED").length;
    
    // Response rate score (0-100)
    const responseScore = (replied / total) * 100;
    
    // Ghosting rate (0-1)
    const ghostingRate = ghosted / total;

    // Average response time
    const latencies = interactions
      .map(i => i.responseTimeDays)
      .filter((l): l is number => l !== null && l !== undefined);
    const avgResponseDays = latencies.length > 0
      ? latencies.reduce((sum, val) => sum + val, 0) / latencies.length
      : 3.0;

    // Engagement score prediction: response rate weighted 60%, stability (1-ghosting) 40%
    let engagementScore = (responseScore * 0.6) + ((1 - ghostingRate) * 40);

    // Boost score if response rate latency is super low
    if (avgResponseDays <= 2.0 && replied > 0) {
      engagementScore += 10;
    }

    // Penalize if status is explicitly GHOSTED
    if (recruiter.status === "GHOSTED") {
      engagementScore = Math.max(10, engagementScore - 40);
    } else if (recruiter.status === "INACTIVE") {
      engagementScore = 0;
    }

    const finalEngagementScore = Math.max(0, Math.min(100, engagementScore));

    // Auto-update status if last interaction is ghosted
    let newStatus = recruiter.status;
    const sortedInteractions = [...interactions].sort((a, b) => b.date.getTime() - a.date.getTime());
    const lastInteraction = sortedInteractions[0];
    if (lastInteraction && lastInteraction.status === "GHOSTED") {
      newStatus = "GHOSTED";
    } else if (lastInteraction && (lastInteraction.status === "REPLIED" || lastInteraction.status === "INTERVIEW_SCHEDULED")) {
      newStatus = "ACTIVE";
    }

    await prisma.recruiter.update({
      where: { id: recruiterId },
      data: {
        responseScore,
        ghostingRate,
        avgResponseDays,
        engagementScore: finalEngagementScore,
        status: newStatus
      }
    });
  }
}
