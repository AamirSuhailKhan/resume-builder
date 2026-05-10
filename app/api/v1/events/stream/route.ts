import { NextRequest } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

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

      // In a real multi-instance environment, you'd subscribe to Redis pub/sub here.
      // For now, we will send an initial heartbeat and then close, or keep open with keepalive.
      sendEvent({ type: "connected", timestamp: new Date().toISOString() });

      const interval = setInterval(() => {
        sendEvent({ type: "heartbeat", timestamp: new Date().toISOString() });
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
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
