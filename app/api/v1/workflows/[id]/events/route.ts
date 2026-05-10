import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { OrchestrationEventBus } from "@/lib/orchestration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const after = req.nextUrl.searchParams.get("after");
  const afterSequence = after ? BigInt(after) : undefined;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (eventName: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(safeJson(data))}\n\n`)
        );
      };

      const existing = await OrchestrationEventBus.listWorkflowEvents(user.id, id, afterSequence);
      for (const event of existing) {
        send(event.type, event);
      }

      const unsubscribe = OrchestrationEventBus.subscribeWorkflow(id, (event) => {
        if (event.userId !== user.id) return;
        send(event.type, event);
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: {"ok":true}\n\n`));
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
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

function safeJson(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, entryValue) =>
    typeof entryValue === "bigint" ? entryValue.toString() : entryValue
  ));
}
