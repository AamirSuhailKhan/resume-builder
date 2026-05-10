import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getQueueRedisConnection } from "@/lib/queue/connection";
import { OrchestrationEventBus } from "@/lib/orchestration/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workflowId = req.nextUrl.searchParams.get("workflowId");
  const channel = workflowId
    ? OrchestrationEventBus.workflowChannel(workflowId)
    : OrchestrationEventBus.channel(session.user.id);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          console.error("Stream enqueue error:", e);
        }
      };

      sendEvent({ type: "connected", timestamp: new Date().toISOString(), channel });

      let subscriber: ReturnType<typeof getQueueRedisConnection> | null = null;

      try {
        subscriber = getQueueRedisConnection().duplicate();
        await subscriber.subscribe(channel);
        
        subscriber.on("message", (ch, message) => {
          if (ch === channel) {
            try {
              const eventData = JSON.parse(message);
              sendEvent(eventData);
            } catch (err) {
              console.error("Failed to parse Redis message", err);
            }
          }
        });
      } catch (err) {
        console.error("Redis subscription failed", err);
      }

      const interval = setInterval(() => {
        sendEvent({ type: "heartbeat", timestamp: new Date().toISOString() });
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        if (subscriber) {
          subscriber.unsubscribe(channel).catch(() => {});
          subscriber.quit().catch(() => {});
        }
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
