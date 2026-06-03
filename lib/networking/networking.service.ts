import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export interface CreateContactInput {
  userId: string;
  name: string;
  title?: string | null | undefined;
  company?: string | null | undefined;
  school?: string | null | undefined;
  graduationYear?: number | null | undefined;
  linkedinUrl?: string | null | undefined;
  email?: string | null | undefined;
  isAlumni?: boolean | undefined;
  isRecruiter?: boolean | undefined;
  isReferralPartner?: boolean | undefined;
  notes?: string | null | undefined;
}

export interface CreateActivityInput {
  contactId: string;
  type: "EMAIL" | "LINKEDIN_MESSAGE" | "COFFEE_CHAT" | "PHONE_CALL" | "OTHER";
  description: string;
  outcome?: string | null | undefined;
  date?: Date | undefined;
}

export class NetworkingService {
  /**
   * Add a new contact to the Networking CRM
   */
  static async createContact(input: CreateContactInput) {
    try {
      const contact = await prisma.networkContact.create({
        data: {
          userId: input.userId,
          name: input.name,
          title: input.title ?? null,
          company: input.company ?? null,
          school: input.school ?? null,
          graduationYear: input.graduationYear ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          email: input.email ?? null,
          isAlumni: input.isAlumni ?? false,
          isRecruiter: input.isRecruiter ?? false,
          isReferralPartner: input.isReferralPartner ?? false,
          notes: input.notes ?? null,
          connectionStrength: this.calculateInitialStrength(input)
        }
      });
      return contact;
    } catch (error) {
      logger.error({ error, name: input.name }, "Failed to create network contact");
      throw error;
    }
  }

  /**
   * Retrieve all contacts for a user with optional filters
   */
  static async getContacts(userId: string, filters?: {
    isAlumni?: boolean;
    isRecruiter?: boolean;
    company?: string;
    status?: string;
  }) {
    try {
      const whereClause: any = { userId };
      if (filters?.isAlumni !== undefined) {
        whereClause.isAlumni = filters.isAlumni;
      }
      if (filters?.isRecruiter !== undefined) {
        whereClause.isRecruiter = filters.isRecruiter;
      }
      if (filters?.status !== undefined) {
        whereClause.status = filters.status;
      }
      if (filters?.company) {
        whereClause.company = { contains: filters.company, mode: 'insensitive' };
      }

      return await prisma.networkContact.findMany({
        where: whereClause,
        include: {
          activities: {
            orderBy: { date: 'desc' }
          }
        },
        orderBy: { connectionStrength: 'desc' }
      });
    } catch (error) {
      logger.error({ error, userId }, "Failed to fetch network contacts");
      throw error;
    }
  }

  /**
   * Update a contact's profile
   */
  static async updateContact(contactId: string, data: Partial<Omit<CreateContactInput, "userId">> & { status?: string; notes?: string }) {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.title !== undefined) updateData.title = data.title ?? null;
      if (data.company !== undefined) updateData.company = data.company ?? null;
      if (data.school !== undefined) updateData.school = data.school ?? null;
      if (data.graduationYear !== undefined) updateData.graduationYear = data.graduationYear ?? null;
      if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl ?? null;
      if (data.email !== undefined) updateData.email = data.email ?? null;
      if (data.isAlumni !== undefined) updateData.isAlumni = data.isAlumni;
      if (data.isRecruiter !== undefined) updateData.isRecruiter = data.isRecruiter;
      if (data.isReferralPartner !== undefined) updateData.isReferralPartner = data.isReferralPartner;
      if (data.notes !== undefined) updateData.notes = data.notes ?? null;
      if (data.status !== undefined) updateData.status = data.status;

      const contact = await prisma.networkContact.update({
        where: { id: contactId },
        data: updateData
      });
      await this.recalculateConnectionStrength(contactId);
      return contact;
    } catch (error) {
      logger.error({ error, contactId }, "Failed to update network contact");
      throw error;
    }
  }

  /**
   * Delete a contact
   */
  static async deleteContact(contactId: string) {
    try {
      return await prisma.networkContact.delete({
        where: { id: contactId }
      });
    } catch (error) {
      logger.error({ error, contactId }, "Failed to delete network contact");
      throw error;
    }
  }

  /**
   * Log an outreach activity with a contact
   */
  static async logActivity(input: CreateActivityInput) {
    try {
      const activity = await prisma.networkActivity.create({
        data: {
          contactId: input.contactId,
          type: input.type,
          description: input.description,
          outcome: input.outcome ?? null,
          date: input.date ?? new Date()
        }
      });

      // Automatically transition status based on activity
      await this.autoTransitionStatus(input.contactId, input.type);
      
      // Recalculate connection strength
      await this.recalculateConnectionStrength(input.contactId);

      return activity;
    } catch (error) {
      logger.error({ error, contactId: input.contactId }, "Failed to log network activity");
      throw error;
    }
  }

  /**
   * Suggest warm introductions for a user target company
   */
  static async suggestWarmIntros(userId: string, targetCompany: string) {
    try {
      // Find connected contacts at the target company
      const directContacts = await prisma.networkContact.findMany({
        where: {
          userId,
          company: { contains: targetCompany, mode: 'insensitive' },
          connectionStrength: { gte: 30 } // Reasonable connection
        }
      });

      // Find alumni at the target company (even if connection strength is low)
      const alumniContacts = await prisma.networkContact.findMany({
        where: {
          userId,
          company: { contains: targetCompany, mode: 'insensitive' },
          isAlumni: true
        }
      });

      // Generate outreach templates
      const suggestions = [...directContacts, ...alumniContacts].map(contact => {
        let template = "";
        if (contact.isAlumni) {
          template = `Hi ${contact.name},\n\nI noticed you graduated from ${contact.school || "our alma mater"} and are now working at ${targetCompany} as a ${contact.title || "Professional"}. I'm currently looking to transition into a similar path and would love to ask you a few quick questions about the culture there. Let me know if you'd be open to a 10-minute chat!\n\nBest,\n[Your Name]`;
        } else {
          template = `Hi ${contact.name},\n\nHope you're doing well! I saw that you're working at ${targetCompany} as a ${contact.title || "Professional"}. I'm currently applying for a role there and was wondering if you might be open to a quick catch-up to share any insights about the team. Hope to talk soon!\n\nBest,\n[Your Name]`;
        }
        return {
          contact,
          type: contact.isAlumni ? "Alumni Intro" : "Direct Outreach",
          template
        };
      });

      return suggestions;
    } catch (error) {
      logger.error({ error, userId, targetCompany }, "Failed to generate warm intro suggestions");
      throw error;
    }
  }

  /**
   * Connection Strength scoring algorithm
   */
  private static calculateInitialStrength(input: CreateContactInput): number {
    let score = 10; // Baseline
    if (input.isAlumni) score += 15;
    if (input.email) score += 10;
    if (input.linkedinUrl) score += 10;
    return score;
  }

  private static async recalculateConnectionStrength(contactId: string) {
    const contact = await prisma.networkContact.findUnique({
      where: { id: contactId },
      include: { activities: true }
    });
    if (!contact) return;

    let score = this.calculateInitialStrength({
      userId: contact.userId,
      name: contact.name,
      email: contact.email ?? undefined,
      linkedinUrl: contact.linkedinUrl ?? undefined,
      isAlumni: contact.isAlumni,
      isRecruiter: contact.isRecruiter
    });

    // Score based on number and type of activities
    contact.activities.forEach(activity => {
      switch (activity.type) {
        case "COFFEE_CHAT":
          score += 25;
          break;
        case "PHONE_CALL":
          score += 15;
          break;
        case "EMAIL":
          score += 8;
          break;
        case "LINKEDIN_MESSAGE":
          score += 5;
          break;
        default:
          score += 5;
      }
    });

    // Cap the score at 100
    const finalScore = Math.min(100, score);

    await prisma.networkContact.update({
      where: { id: contactId },
      data: { connectionStrength: finalScore }
    });
  }

  private static async autoTransitionStatus(contactId: string, activityType: string) {
    const contact = await prisma.networkContact.findUnique({ where: { id: contactId } });
    if (!contact) return;

    let newStatus = contact.status;

    if (contact.status === "DISCOVERED") {
      if (activityType === "EMAIL" || activityType === "LINKEDIN_MESSAGE") {
        newStatus = "OUTREACHED";
      }
    }

    if (activityType === "COFFEE_CHAT" || activityType === "PHONE_CALL") {
      newStatus = "COFFEE_CHAT";
    }

    if (newStatus !== contact.status) {
      await prisma.networkContact.update({
        where: { id: contactId },
        data: { status: newStatus }
      });
    }
  }
}
