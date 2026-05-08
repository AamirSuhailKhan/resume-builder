import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { queueNames } from "@/lib/queue/types";
import { getQueueRedisConnection } from "@/lib/queue/connection";

export const runtime = "nodejs";

// Add basic auth or admin check here if needed later

export async function GET() {
  const connection = getQueueRedisConnection();
  const queueStats: Record<string, any> = {};

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
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", error: error.message },
      { status: 500 }
    );
  }
}
