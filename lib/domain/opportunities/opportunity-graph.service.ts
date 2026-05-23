import { prisma } from "@/lib/db/prisma";
import { JobOpportunity, ConnectionPath, Application, HiringContact, EmailCampaign, EmailDraft } from "@prisma/client";

export interface OpportunityConfidence {
  score: number; // 0-100
  tier: "High" | "Medium" | "Low";
  reasons: string[];
}

export interface OpportunityGraph {
  job: JobOpportunity;
  application: (Application & { emailCampaign?: (EmailCampaign & { emails: EmailDraft[] }) | null }) | null;
  connections: ConnectionPath[];
  hiringContacts: HiringContact[];
  workflows: any[];
  confidence: OpportunityConfidence;
  status: string; // "Matched" | "Tailoring" | "Ready to apply" | "Applying" | "Awaiting approval" | "Submitted" | "Following up" | "Interviewing" | "Closed"
}

export class OpportunityGraphService {
  async getOpportunityGraph(userId: string, jobOpportunityId: string): Promise<OpportunityGraph | null> {
    const job = await prisma.jobOpportunity.findUnique({
      where: { id: jobOpportunityId },
    });

    if (!job || job.userId !== userId) {
      return null;
    }

    const [connections, hiringContacts, application] = await Promise.all([
      prisma.connectionPath.findMany({ where: { userId, jobOpportunityId }, orderBy: { strength: "desc" } }),
      prisma.hiringContact.findMany({ where: { jobOpportunities: { some: { id: jobOpportunityId } } } }),
      prisma.application.findFirst({
        where: { userId, jobOpportunityId },
        include: { emailCampaign: { include: { emails: { orderBy: { sequence: "asc" } } } } },
      }),
    ]);

    return {
      job,
      application,
      connections,
      hiringContacts,
      workflows: [],
      confidence: this.calculateConfidence(job, connections),
      status: this.determineStatus(job, application),
    };
  }

  private calculateConfidence(job: JobOpportunity, connections: ConnectionPath[]): OpportunityConfidence {
    let score = 50;
    const reasons: string[] = [];

    // Base match score (up to +30)
    const matchPoints = (job.matchScore / 100) * 30;
    score += matchPoints;
    if (job.matchScore > 80) reasons.push("Strong background match");

    // Ghost score (up to -40)
    if (job.ghostScore > 60) {
      score -= 40;
      reasons.push("High probability of being a ghost job");
    } else if (job.ghostScore > 25) {
      score -= 15;
      reasons.push("Suspicious job posting");
    } else {
      score += 10;
      reasons.push("Verified active opportunity");
    }

    // Networking (up to +20)
    if (connections.length > 0) {
      const topConnection = connections[0];
      if (topConnection && topConnection.confidenceTier === "verified") {
        score += 20;
        reasons.push("Verified network connection found");
      } else {
        score += 10;
        reasons.push("Potential networking paths identified");
      }
    }

    score = Math.min(100, Math.max(0, Math.round(score)));

    let tier: "High" | "Medium" | "Low" = "Low";
    if (score >= 75) tier = "High";
    else if (score >= 40) tier = "Medium";

    return { score, tier, reasons };
  }

  private determineStatus(job: JobOpportunity, application: Application | null): string {
    if (!application) return "Matched";
    
    if (application.status === "applied") return "Submitted";
    if (application.status === "interview") return "Interviewing";
    if (application.status === "rejected") return "Closed";

    if (application.generatedResume || application.coverLetter) {
      return "Ready to apply";
    }

    return "Tailoring";
  }
}
