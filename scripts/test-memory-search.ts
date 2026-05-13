/**
 * scripts/test-memory-search.ts
 *
 * Quick smoke-test for pgvector career memory search.
 * Run: npx tsx scripts/test-memory-search.ts
 *
 * Requirements:
 *   - DATABASE_URL pointing to a Supabase Postgres with pgvector enabled
 *   - OPENAI_API_KEY set
 */
import "dotenv/config";
import { memoryService } from "../lib/services/memory.service";
import { prisma } from "../lib/db/prisma";

const TEST_USER_ID = process.env.TEST_USER_ID ?? "00000000-0000-0000-0000-000000000000";

async function main() {
  console.log("\n🧠 Career Memory Search Smoke-Test\n");

  // ── 1. Upsert a test memory ───────────────────────────────────────────────
  console.log("1️⃣  Upserting test memory...");
  const result = await memoryService.upsertMemory(TEST_USER_ID, {
    type: "work_experience",
    title: "Software Engineer at Google",
    content: "Built distributed systems using Go and Kubernetes. Led a team of 5 to deliver a 99.99% uptime microservices platform.",
    source: "test-script",
    confidence: 0.95,
  });
  console.log("   ✅ Memory upserted:", result);

  // ── 2. Similarity search ──────────────────────────────────────────────────
  console.log("\n2️⃣  Searching for: 'distributed systems and cloud infrastructure'...");
  const searchResults = await memoryService.searchMemories(
    TEST_USER_ID,
    "distributed systems and cloud infrastructure",
    3
  );

  if (searchResults.length === 0) {
    console.log("   ⚠️  No results — check if the embedding column is populated and pgvector is enabled.");
  } else {
    console.log(`   ✅ Found ${searchResults.length} result(s):`);
    for (const r of searchResults) {
      console.log(`      [${r.type}] ${r.title} — similarity: ${(r.similarity * 100).toFixed(1)}%`);
    }
  }

  // ── 3. Cleanup ────────────────────────────────────────────────────────────
  console.log("\n3️⃣  Cleaning up test data...");
  await prisma.careerMemory.deleteMany({
    where: { userId: TEST_USER_ID, source: "test-script" },
  });
  console.log("   ✅ Done.\n");
}

main()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
