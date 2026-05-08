# Worker Architecture

This document describes the background worker architecture for the ResumeAI SaaS.

## Separation of Concerns

To ensure production reliability and prevent massive memory/CPU hogs (like PDF generation or AI rewrites) from blocking crucial background tasks (like saving or emails), the worker architecture is divided into specialized queues:

1. \`ats-analysis\`: Handles heavy AI-driven resume and job matching tasks.
2. \`job-sync\`: Manages scheduled scraping and syncing from provider APIs.
3. \`analytics\`: Computes heavy aggregations asynchronously.
4. \`cleanup\`: Garbage collection for stale jobs and orphaned records.
5. \`email\`: High-priority, fast queue for transactional emails.
6. \`autosave\`: High-frequency, low-latency resume draft saving.

## Infrastructure

- **Broker**: Redis (Upstash Serverless or managed Redis).
- **Library**: BullMQ (with Redis pub/sub).
- **Deployment**: Workers are deployed completely separate from the Next.js API. 
  - **Next.js Vercel app**: Enqueues jobs.
  - **Worker Server**: A long-running Node.js process (e.g. on Railway, Render, or Fly.io).

## Running Locally

To run the Next.js frontend:
\`\`\`bash
npm run dev
\`\`\`

To run the background workers locally (in a separate terminal):
\`\`\`bash
npm run worker
\`\`\`

## Deployment with Docker

Build and run the worker image:
\`\`\`bash
docker build -t resumeai-worker -f docker/worker.Dockerfile .
docker run --env-file .env resumeai-worker
\`\`\`
