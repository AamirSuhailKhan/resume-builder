/**
 * lib/services/memory.service.ts
 *
 * pgvector Career Memory Service
 *
 * Responsibilities:
 *  - Generate OpenAI text-embedding-3-small embeddings (1536 dims)
 *  - Upsert CareerMemory rows with vector embeddings via raw SQL
 *  - Cosine-similarity search via pgvector <=> operator
 *  - Extract memories automatically from resume data
 *
 * Server-only — never import on the client.
 */
import "server-only";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import type { ResumeData } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CreateMemoryInput {
  type:
    | "work_experience"
    | "education"
    | "project"
    | "professional_summary"
    | "skills"
    | "certification"
    | "achievement";
  title: string;
  content: string;
  source?: string | undefined;
  confidence?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MemorySearchResult {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  confidence: number;
  source: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIMS = 1536;
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ---------------------------------------------------------------------------
// MemoryService
// ---------------------------------------------------------------------------
export class MemoryService {
  // ── Embedding ─────────────────────────────────────────────────────────────

  /**
   * Generate an OpenAI text-embedding-3-small vector for the given text.
   * Results are cached in Redis keyed by SHA-256 of the input text.
   */
  async embedText(text: string): Promise<number[]> {
    const cacheKey = `embed:${createHash("sha256").update(text).digest("hex")}`;
    const redis = getRedisClient();

    // Check cache first
    if (redis) {
      try {
        const cached = await redis.get<number[]>(cacheKey);
        if (cached && Array.isArray(cached) && cached.length === EMBED_DIMS) {
          return cached;
        }
      } catch (err) {
        logger.warn({ err }, "[MemoryService] Redis cache read failed — will embed directly.");
      }
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("[MemoryService] OPENAI_API_KEY is not configured.");
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[MemoryService] OpenAI embedding failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as { data: [{ embedding: number[] }] };
    const embedding = json.data[0]?.embedding;

    if (!embedding || embedding.length !== EMBED_DIMS) {
      throw new Error(`[MemoryService] Unexpected embedding length: ${embedding?.length}`);
    }

    // Cache for 7 days
    if (redis) {
      redis
        .set(cacheKey, embedding, { ex: CACHE_TTL_SECONDS })
        .catch((err) => logger.warn({ err }, "[MemoryService] Redis cache write failed."));
    }

    return embedding;
  }

  // ── Upsert ────────────────────────────────────────────────────────────────

  /**
   * Create or update a CareerMemory record with a fresh vector embedding.
   * Uses $executeRaw because Prisma Client does not natively support vector columns.
   */
  async upsertMemory(
    userId: string,
    data: CreateMemoryInput
  ): Promise<{ id: string; title: string; type: string }> {
    const { type, title, content, source = "agent", confidence = 0.8, metadata = {} } = data;
    const id = crypto.randomUUID();

    let embedding: number[];
    try {
      embedding = await this.embedText(`${title}: ${content}`);
    } catch (err) {
      logger.error({ err, userId, title }, "[MemoryService] Failed to generate embedding — saving without vector.");
      // Fall back: insert without embedding
      const row = await prisma.careerMemory.create({
        data: {
          id, userId, type, title, content, source, confidence,
          metadata: (metadata ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
        },
        select: { id: true, title: true, type: true },
      });
      return row;
    }

    // Format as pgvector literal: '[0.1,0.2,...]'
    const vectorLiteral = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO "CareerMemory" (id, "userId", type, title, content, embedding, confidence, source, metadata, "createdAt", "updatedAt")
      VALUES (
        ${id}::uuid,
        ${userId}::uuid,
        ${type},
        ${title},
        ${content},
        ${vectorLiteral}::vector,
        ${confidence},
        ${source},
        ${JSON.stringify(metadata ?? {})}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
        SET content   = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            "updatedAt" = NOW()
    `;

    logger.info({ id, userId, type, title }, "[MemoryService] Memory upserted.");
    return { id, title, type };
  }

  // ── Similarity Search ─────────────────────────────────────────────────────

  /**
   * Find the top-k CareerMemory records for a user by cosine similarity to the query text.
   * Uses pgvector's <=> (cosine distance) operator via raw SQL.
   */
  async searchMemories(
    userId: string,
    query: string,
    limit = 5
  ): Promise<MemorySearchResult[]> {
    let embedding: number[];
    try {
      embedding = await this.embedText(query);
    } catch (err) {
      logger.error({ err, userId }, "[MemoryService] Search embedding failed — returning empty.");
      return [];
    }

    const vectorLiteral = `[${embedding.join(",")}]`;

    const rows = await prisma.$queryRaw<MemorySearchResult[]>`
      SELECT
        id,
        "userId",
        type,
        title,
        content,
        confidence,
        source,
        metadata,
        "createdAt",
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "CareerMemory"
      WHERE "userId" = ${userId}::uuid
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;

    return rows;
  }

  // ── Resume Extraction ─────────────────────────────────────────────────────

  /**
   * Extract and upsert structured career memories from a parsed resume.
   * Called automatically on every autosave (workers/handlers/autosave.ts).
   */
  async extractMemoriesFromResume(userId: string, resumeData: ResumeData): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    // Professional summary
    if (resumeData.personal?.summary) {
      tasks.push(
        this.upsertMemory(userId, {
          type: "professional_summary",
          title: "Professional Summary",
          content: resumeData.personal.summary,
          source: "resume",
          confidence: 0.95,
        }).catch((err) => logger.warn({ err }, "[MemoryService] summary extraction failed"))
      );
    }

    // Skills
    if (Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
      tasks.push(
        this.upsertMemory(userId, {
          type: "skills",
          title: "Technical & Professional Skills",
          content: resumeData.skills.join(", "),
          source: "resume",
          confidence: 0.95,
        }).catch((err) => logger.warn({ err }, "[MemoryService] skills extraction failed"))
      );
    }

    // Work experience
    for (const exp of resumeData.experience ?? []) {
      const content = [
        `Role: ${exp.role} at ${exp.company}`,
        exp.startDate ? `Period: ${exp.startDate} – ${exp.endDate || "Present"}` : "",
        exp.points ? `Responsibilities & Achievements:\n${exp.points}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      tasks.push(
        this.upsertMemory(userId, {
          type: "work_experience",
          title: `${exp.role} at ${exp.company}`,
          content,
          source: "resume",
          confidence: 0.9,
          metadata: { company: exp.company, role: exp.role },
        }).catch((err) => logger.warn({ err }, "[MemoryService] experience extraction failed"))
      );
    }

    // Education (uses school/year per ResumeData interface)
    for (const edu of resumeData.education ?? []) {
      tasks.push(
        this.upsertMemory(userId, {
          type: "education",
          title: `${edu.degree} — ${edu.school}`,
          content: `${edu.degree} at ${edu.school}. Year: ${edu.year}`,
          source: "resume",
          confidence: 0.9,
          metadata: { school: edu.school, degree: edu.degree },
        }).catch((err) => logger.warn({ err }, "[MemoryService] education extraction failed"))
      );
    }

    await Promise.all(tasks);
    logger.info({ userId, taskCount: tasks.length }, "[MemoryService] Resume memory extraction complete.");
  }
}

// Singleton
export const memoryService = new MemoryService();
