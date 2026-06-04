import { PrismaClient } from "@prisma/client";
import { OpportunityIntelligenceService } from "../lib/job-intelligence/opportunity-intelligence";

const prisma = new PrismaClient();

const jobsToSeed = [
  {
    company: "Stripe",
    role: "Staff Software Engineer, AI Platform",
    location: "Remote",
    salaryRange: "$280k–$380k",
    description: "Design the AI platform layer powering Stripe Radar, Stripe Sigma AI, and future ML products. Own the MLOps and inference serving stack. Deep experience with distributed systems and Python/Go/TypeScript is required.",
    sourceType: "verified"
  },
  {
    company: "Anthropic",
    role: "Member of Technical Staff, Inference",
    location: "San Francisco, CA",
    salaryRange: "$300k–$450k",
    description: "Build and scale Claude inference infrastructure. Work on distributed serving, model optimization, and reliability at the frontier. Experience with CUDA, Pytorch, and Python distributed architectures.",
    sourceType: "verified"
  },
  {
    company: "Vercel",
    role: "Principal Engineer, AI Runtime",
    location: "Remote",
    salaryRange: "$260k–$360k",
    description: "Build the AI SDK and streaming runtime powering the Next.js AI ecosystem. Own the v1 of Vercel AI Gateway. Deep knowledge of React Server Components, streaming response models, and Node.js performance tuning.",
    sourceType: "verified"
  },
  {
    company: "Scale AI",
    role: "Principal Engineer, RLHF Platform",
    location: "San Francisco, CA",
    salaryRange: "$270k–$370k",
    description: "Own the RLHF data pipeline, annotation quality systems, and evaluator infrastructure for frontier model training. Work with Kubernetes, Python, and large scale data transformation pipelines.",
    sourceType: "verified"
  },
  {
    company: "Linear",
    role: "Senior Engineer, AI Features",
    location: "Remote",
    salaryRange: "$220k–$300k",
    description: "Ship AI features into Linear: auto-triage, smart summaries, code-linked issues. Small team, high autonomy. Strong product-minded engineering skills and TypeScript experience required.",
    sourceType: "ai_inferred"
  },
  {
    company: "Notion",
    role: "Staff Engineer, AI",
    location: "Remote",
    salaryRange: "$240k–$320k",
    description: "Lead the AI engineering team building Notion AI Q&A, summarization, and the emerging AI blocks system. Fullstack experience with Node.js, React, and postgres is preferred.",
    sourceType: "ai_inferred"
  },
  {
    company: "Razorpay",
    role: "Software Engineer",
    location: "Bengaluru, India",
    salaryRange: "₹18L - ₹24L",
    description: "Build next-generation fintech payment gateways and merchant dashboard systems. Work on highly concurrent Java/Go/Node.js systems, access control, role-based workflows, and transaction monitoring.",
    sourceType: "verified"
  },
  {
    company: "Swiggy",
    role: "Software Engineer",
    location: "Bengaluru, India",
    salaryRange: "₹16L - ₹22L",
    description: "Design and implement reliable delivery tracking APIs and driver assignment logistics algorithms. Optimize microservice architectures with Redis caching, Kafka message queue, and Node.js backend services.",
    sourceType: "verified"
  }
];

async function main() {
  const targetUser = await prisma.user.findFirst({
    where: { email: "aamirsuhailkhan2002@gmail.com" },
  });

  if (!targetUser) {
    console.error("Target user not found");
    return;
  }

  const targetUserId = targetUser.id;

  // Clear existing job opportunities for the target user to avoid duplication
  const deletedIntel = await prisma.jobIntelligence.deleteMany({
    where: {
      jobOpportunity: { userId: targetUserId }
    }
  });
  console.log(`Deleted ${deletedIntel.count} target job intelligence records.`);

  const deletedJobs = await prisma.jobOpportunity.deleteMany({
    where: { userId: targetUserId }
  });
  console.log(`Deleted ${deletedJobs.count} target job opportunities.`);

  console.log(`Seeding ${jobsToSeed.length} jobs for ${targetUser.email}.`);

  for (const job of jobsToSeed) {
    const newJob = await prisma.jobOpportunity.create({
      data: {
        userId: targetUserId,
        company: job.company,
        role: job.role,
        location: job.location,
        salaryRange: job.salaryRange,
        description: job.description,
        sourceType: job.sourceType as any,
      }
    });

    console.log(`Created job: ${newJob.role} at ${newJob.company}`);

    // Compute opportunity intelligence
    await OpportunityIntelligenceService.computeOpportunityIntelligence(newJob.id, targetUserId)
      .then((intel) => {
        console.log(`Computed intelligence score: ${intel.opportunityScore} for ${newJob.role}`);
      })
      .catch((err) => {
        console.error(`Failed to compute intelligence for ${newJob.role}:`, err.message);
      });
  }

  console.log("Job seeding and intelligence generation completed successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
