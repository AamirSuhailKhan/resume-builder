-- Enable pgvector extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add 1536-dim embedding column to CareerMemory
ALTER TABLE "CareerMemory" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- HNSW index for fast cosine similarity search — O(log n)
CREATE INDEX IF NOT EXISTS "CareerMemory_embedding_hnsw_idx"
  ON "CareerMemory" USING hnsw ("embedding" vector_cosine_ops);
