import { prisma } from "@/lib/db/prisma";
import { JobDeduplicator } from "@/lib/domain/jobs/deduplicator.service";
import { Queue, Worker, Job } from "bullmq";
import { createRedisConnection } from "@/lib/queue/connection";

const QUEUE_NAME = "backfill-canonical-jobs";

async function enqueueChunks() {
  const connection = createRedisConnection();
  const queue = new Queue(QUEUE_NAME, { connection });

  console.log("Fetching users with JobOpportunities...");
  const users = await prisma.jobOpportunity.groupBy({
    by: ['userId'],
  });

  console.log(`Found ${users.length} users. Enqueueing chunks...`);
  
  for (const u of users) {
    await queue.add("process-user", { userId: u.userId }, {
      jobId: `backfill:user:${u.userId}`, // Idempotency
    });
  }

  console.log("Enqueued all chunks successfully.");
  await queue.close();
  await connection.quit();
}

async function runWorker() {
  const connection = createRedisConnection();
  
  console.log(`Starting worker on queue: ${QUEUE_NAME}...`);
  
  const worker = new Worker(QUEUE_NAME, async (job: Job) => {
    const { userId } = job.data;
    
    const opps = await prisma.jobOpportunity.findMany({
      where: { 
        userId,
        canonicalJobId: null
      }
    });

    if (opps.length === 0) {
      return { status: "skipped", reason: "no unlinked opportunities" };
    }

    let processed = 0;
    for (const opp of opps) {
      try {
        let externalId: string | undefined;
        let remote: boolean | undefined;
        let employmentType: string | undefined;
        let postedAt: Date | undefined;

        if (opp.parsed && typeof opp.parsed === 'object') {
          const parsed = opp.parsed as any;
          externalId = parsed.externalId;
          remote = parsed.remote;
          employmentType = parsed.employmentType;
          postedAt = parsed.postedAt ? new Date(parsed.postedAt) : undefined;
        }

        const canonical = await JobDeduplicator.processJob({
          title: opp.role,
          company: opp.company,
          location: opp.location || undefined,
          remote,
          employmentType,
          source: opp.sourceType || "verified",
          sourceUrl: opp.sourceUrl || "",
          externalId,
          description: opp.description,
          postedAt,
        } as any);

        await prisma.jobOpportunity.update({
          where: { id: opp.id },
          data: { canonicalJobId: canonical.id }
        });

        processed++;
      } catch (err) {
        console.error(`Error processing job ${opp.id}:`, err);
      }
    }

    return { status: "success", processed, total: opps.length };
  }, { connection, concurrency: 5 });

  worker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed: ${result.processed}/${result.total} opps processed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--enqueue")) {
    await enqueueChunks();
    process.exit(0);
  } else if (args.includes("--work")) {
    await runWorker();
  } else {
    console.log("Usage: ts-node scripts/backfill-canonical-jobs.ts [--enqueue] [--work]");
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
