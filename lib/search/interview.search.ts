import { prisma } from "@/lib/db/prisma";
import { INTERVIEW_QUESTIONS_INDEX, meilisearch } from "@/lib/search/meilisearch";
import { logger } from "@/lib/logger";

export async function indexInterviewQuestion(questionId: string) {
  const question = await prisma.interviewQuestion.findUnique({
    where: { id: questionId },
    include: {
      frequencies: {
        include: { company: true, companyRole: true },
      },
      tags: true,
    },
  });
  if (!question) return;

  const companyNames = Array.from(new Set(question.frequencies.map((item) => item.company.name)));
  const roleTitles = Array.from(new Set(question.frequencies.map((item) => item.companyRole?.title).filter(Boolean)));
  const frequencyScore = Math.max(0, ...question.frequencies.map((item) => item.frequencyScore));

  await meilisearch.index(INTERVIEW_QUESTIONS_INDEX).addDocuments([{
    id: question.id,
    title: question.title,
    prompt: question.prompt,
    kind: question.kind,
    difficulty: question.difficulty,
    topic: question.topic,
    companyNames,
    roleTitles,
    tags: question.tags.map((tag) => tag.label),
    popularityScore: question.popularityScore,
    freshnessScore: question.freshnessScore,
    frequencyScore,
    lastSeenAt: question.lastSeenAt.toISOString(),
    indiaMarket: true,
  }]).catch((error) => {
    logger.warn({ error, questionId }, "[InterviewSearch] Failed to index question");
  });
}

export async function searchInterviewMeili(query: string, filters: {
  company?: string;
  role?: string;
  kind?: string;
  difficulty?: string;
  limit?: number;
}) {
  const filter: string[] = [];
  if (filters.company) filter.push(`companyNames = "${filters.company}"`);
  if (filters.role) filter.push(`roleTitles = "${filters.role}"`);
  if (filters.kind) filter.push(`kind = "${filters.kind}"`);
  if (filters.difficulty) filter.push(`difficulty = "${filters.difficulty}"`);

  const result = await meilisearch.index(INTERVIEW_QUESTIONS_INDEX).search(query, {
    limit: filters.limit ?? 20,
    ...(filter.length ? { filter: filter.join(" AND ") } : {}),
    sort: ["frequencyScore:desc", "freshnessScore:desc"],
  });

  return result.hits;
}
