import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { queueNames } from "@/lib/queue/types";
import { getQueueRedisConnection } from "@/lib/queue/connection";

export const runtime = "nodejs";

type QueueStats = Record<string, {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}>;

export async function GET() {
  const connection = getQueueRedisConnection();
  const queueStats: QueueStats = {};

  try {
    for (const [key, qName] of Object.entries(queueNames)) {
      const queue = new Queue(qName, { connection });
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      queueStats[qName] = { waiting, active, completed, failed, delayed };
      
      // Don't leak too many connections
      await queue.close();
    }

    return NextResponse.json({
      status: "healthy",
      queues: queueStats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Queue health check failed";
    return NextResponse.json(
      { status: "unhealthy", error: message },
      { status: 500 }
    );
  }
}
