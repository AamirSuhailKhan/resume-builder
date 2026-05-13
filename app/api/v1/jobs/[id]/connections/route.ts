import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError, apiOk, errorToResponse } from "@/lib/api/response";
import { ConnectionInferenceService } from "@/lib/services/connection-inference.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return apiError("Unauthorized", 401);

    const p = await params;
    const jobOpportunityId = p.id;
    
    const job = await prisma.jobOpportunity.findUnique({
      where: { id: jobOpportunityId },
    });

    if (!job || job.userId !== userId) {
      return apiError("Job opportunity not found", 404);
    }

    // 1. Check if connections already exist
    let connections = await prisma.connectionPath.findMany({
      where: { userId, jobOpportunityId },
      orderBy: { strength: "desc" },
    });

    // 2. If no connections, infer them
    if (connections.length === 0) {
      const inferenceService = new ConnectionInferenceService();
      const inferred = await inferenceService.inferConnections(userId, job.company, job.role);
      
      if (inferred.length > 0) {
        // Save to DB
        await prisma.connectionPath.createMany({
          data: inferred.map(conn => ({
            userId,
            jobOpportunityId,
            type: conn.type,
            strength: conn.strength,
            personName: conn.personName,
            personTitle: conn.personTitle,
            personCompany: conn.personCompany,
            sharedContext: conn.sharedContext,
            linkedinUrl: conn.linkedinSearchQuery ? `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(conn.linkedinSearchQuery)}` : null,
            confidenceTier: conn.confidenceTier,
            source: "ai_inference",
          }))
        });

        // Refetch to return full records with IDs
        connections = await prisma.connectionPath.findMany({
          where: { userId, jobOpportunityId },
          orderBy: { strength: "desc" },
        });
      }
    }

    // Also fetch associated hiring contacts if any
    const hiringContacts = await prisma.hiringContact.findMany({
      where: { jobOpportunities: { some: { id: jobOpportunityId } } },
    });

    return apiOk({ connections, hiringContacts });
  } catch (error) {
    return errorToResponse(error);
  }
}
