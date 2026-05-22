import { prisma } from "@/lib/db/prisma";
import { InterviewIntelligenceService } from "@/lib/interview-intelligence/service";
import type {
  InterviewEmbedPayload,
  InterviewIngestPayload,
  InterviewModeratePayload,
  InterviewNormalizePayload,
  InterviewSolutionPayload,
} from "@/lib/queue/types";

export async function handleInterviewIngest(payload: InterviewIngestPayload) {
  if (payload.sourceType === "company_seed") {
    const result = await InterviewIntelligenceService.seedIndiaCompanyIntelligence();
    await markDone(payload.jobRecordId, result);
    return result;
  }

  if (!payload.rawText) {
    throw new Error("interview_ingest requires rawText unless sourceType is company_seed");
  }

  const result = await InterviewIntelligenceService.ingestRawArtifact({
    sourceType: payload.sourceType,
    ...(payload.sourceUrl ? { sourceUrl: payload.sourceUrl } : {}),
    rawText: payload.rawText,
    ...(payload.companyName ? { companyName: payload.companyName } : {}),
    ...(payload.roleTitle ? { roleTitle: payload.roleTitle } : {}),
  });
  await markDone(payload.jobRecordId, { inserted: result.inserted, artifactId: result.artifact.id });
  return result;
}

export async function handleInterviewNormalize(payload: InterviewNormalizePayload) {
  const artifact = await prisma.rawInterviewArtifact.findUniqueOrThrow({
    where: { id: payload.artifactId },
  });
  const result = await InterviewIntelligenceService.ingestRawArtifact({
    ...(artifact.runId ? { runId: artifact.runId } : {}),
    sourceType: artifact.sourceType,
    ...(artifact.sourceUrl ? { sourceUrl: artifact.sourceUrl } : {}),
    ...(artifact.sourceTitle ? { sourceTitle: artifact.sourceTitle } : {}),
    rawText: artifact.rawText,
  });
  await markDone(payload.jobRecordId, { inserted: result.inserted });
  return result;
}

export async function handleInterviewEmbed(payload: InterviewEmbedPayload) {
  const result = await InterviewIntelligenceService.embedQuestion(payload.questionId);
  await markDone(payload.jobRecordId, result);
  return result;
}

export async function handleInterviewSolution(payload: InterviewSolutionPayload) {
  const result = await InterviewIntelligenceService.generateSolution(payload.questionId);
  await markDone(payload.jobRecordId, { solutionId: result.id });
  return result;
}

export async function handleInterviewModerate(payload: InterviewModeratePayload) {
  const contribution = await prisma.interviewContribution.findUniqueOrThrow({
    where: { id: payload.contributionId },
  });
  await markDone(payload.jobRecordId, { contributionId: contribution.id, status: contribution.status });
  return contribution;
}

async function markDone(jobRecordId: string, output: unknown) {
  await prisma.job.update({
    where: { id: jobRecordId },
    data: {
      status: "completed",
      completedAt: new Date(),
      payload: {
        output,
      } as import("@prisma/client").Prisma.InputJsonObject,
    },
  }).catch(() => undefined);
}
