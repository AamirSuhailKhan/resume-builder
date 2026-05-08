import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { AtsCompletedEvent, eventBus } from "@/lib/events/bus";

export const runtime = "nodejs";
// Dynamic endpoint for SSE
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobRecordId = searchParams.get("jobRecordId");

  if (!jobRecordId) {
    return new Response("Missing jobRecordId", { status: 400 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let isClosed = false;

  const sendEvent = async (event: string, data: unknown) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      isClosed = true;
    }
  };

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    void sendEvent("heartbeat", { time: new Date().toISOString() });
  }, 15000);

  // Subscribe to internal event bus
  const eventName: `ats.completed.${string}` = `ats.completed.${jobRecordId}`;
  
  const listener = (data: AtsCompletedEvent) => {
    void sendEvent("completed", data);
  };

  eventBus.onEvent(eventName, listener);

  req.signal.addEventListener("abort", () => {
    isClosed = true;
    clearInterval(heartbeat);
    eventBus.offEvent(eventName, listener);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering if applicable
    },
  });
}
