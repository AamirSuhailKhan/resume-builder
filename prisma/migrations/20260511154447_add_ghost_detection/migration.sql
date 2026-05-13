-- DropIndex
DROP INDEX "public"."CareerMemory_embedding_hnsw_idx";


-- AlterTable
ALTER TABLE "public"."job_opportunities" ADD COLUMN     "ghostScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ghostSignals" JSONB,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3);
