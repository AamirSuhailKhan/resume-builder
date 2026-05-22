import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("🔍 Validating Prisma Client initialization...");

  // 1. Check if client instance exists
  if (!prisma) {
    console.error("❌ Prisma Client is not initialized.");
    process.exit(1);
  }

  // 2. Check model existence on the client
  const requiredModels = [
    "user",
    "careerTwin",
    "twinMemory",
    "twinInsight",
    "outcomePrediction",
    "careerSimulation",
    "emotionalState",
    "agentRun",
    "workflowRun"
  ] as const;

  let missingModels = false;
  for (const model of requiredModels) {
    if (!(model in prisma)) {
      console.error(`❌ Model "${model}" is missing from the generated Prisma Client.`);
      missingModels = true;
    } else {
      console.log(`✅ Model "${model}" is present in the client.`);
    }
  }

  if (missingModels) {
    console.error("❌ Prisma Client validation failed. Please run 'npx prisma generate'.");
    process.exit(1);
  }

  // 3. Check DB connection
  console.log("🔌 Connecting to database...");
  try {
    // Run a simple query to verify connection and structure
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database is reachable.");
  } catch (error) {
    console.error("❌ Failed to connect to the database. Error:", error);
    process.exit(1);
  }

  // 4. Verify table access
  try {
    await prisma.user.findFirst({ select: { id: true } });
    console.log("✅ User table query succeeded.");
  } catch (error) {
    console.error("❌ Failed to query User table. Check if migrations are applied.", error);
    process.exit(1);
  }

  console.log("🎉 Prisma Client and Database status verified successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Validation script crashed with unhandled error:", err);
  process.exit(1);
});
