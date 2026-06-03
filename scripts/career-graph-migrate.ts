#!/usr/bin/env tsx
/**
 * scripts/career-graph-migrate.ts
 *
 * Migration helper for the Career Graph Engine.
 * Run AFTER `prisma migrate deploy`:
 *   npx tsx scripts/career-graph-migrate.ts
 *
 * Does:
 *  1. Validates all required tables exist
 *  2. Backfills CareerGraphMeta for all users who have no meta row
 *  3. Seeds empty graph structure for users with resumes but no graph nodes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function validateTables(): Promise<void> {
  const tables = [
    "CareerGraphNode",
    "CareerGraphEdge",
    "CareerGraphMeta",
    "CareerGraphEvent",
    "CareerGraphSnapshot",
  ];

  console.log("🔍 Validating Career Graph tables…");

  for (const table of tables) {
    try {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      const model = (prisma as unknown as Record<string, { findFirst?: () => Promise<unknown> }>)[modelName];
      if (model && typeof model.findFirst === "function") {
        await model.findFirst();
      } else {
        throw new Error(`Model ${modelName} not found on Prisma client`);
      }
      console.log(`  ✓ ${table}`);
    } catch (err) {
      console.error(`  ✗ ${table} MISSING — did you run prisma migrate deploy?`);
      console.error((err as Error).message);
      process.exit(1);
    }
  }

  console.log("✅ All tables present\n");
}

async function backfillMeta(): Promise<void> {
  console.log("📊 Backfilling CareerGraphMeta…");

  const users = await prisma.user.findMany({ select: { id: true } });
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = await prisma.careerGraphMeta.findUnique({ where: { userId: user.id } });
    if (existing) { skipped++; continue; }

    const [nodeCount, edgeCount] = await Promise.all([
      prisma.careerGraphNode.count({ where: { userId: user.id } }),
      prisma.careerGraphEdge.count({ where: { userId: user.id } }),
    ]);

    await prisma.careerGraphMeta.create({
      data: {
        userId: user.id,
        totalNodes: nodeCount,
        totalEdges: edgeCount,
        nodesByKind: {},
        edgesByKind: {},
        completenessScore: 0,
        graphVersion: 0,
        lastComputedAt: new Date(),
      },
    });
    created++;
  }

  console.log(`  Created: ${created}, Skipped (already exist): ${skipped}\n`);
}

async function seedEmptyGraphs(): Promise<void> {
  console.log("🌱 Seeding empty graphs for users with resumes but no graph nodes…");

  const usersWithResumes = await prisma.user.findMany({
    where: { resumes: { some: {} } },
    select: { id: true },
  });

  let seeded = 0;
  for (const user of usersWithResumes) {
    const hasNodes = await prisma.careerGraphNode.count({ where: { userId: user.id } });
    if (hasNodes > 0) continue;

    // Emit a seed event so the graph builder can pick it up
    await prisma.careerGraphEvent.create({
      data: {
        userId: user.id,
        eventType: "GRAPH_RECOMPUTED",
        sourceType: "migration_seed",
        payload: { note: "Seeded by career-graph-migrate.ts" },
      },
    });
    seeded++;
  }

  console.log(`  Seeded: ${seeded} users\n`);
  console.log("⚠️  Run a full graph rebuild to populate nodes:");
  console.log("   POST /api/v1/career-graph (per user) or run the bulk rebuilder\n");
}

async function main(): Promise<void> {
  console.log("🚀 Career Graph Engine — Migration Script\n");

  try {
    await validateTables();
    await backfillMeta();
    await seedEmptyGraphs();
    console.log("✅ Migration complete");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
