import { useEffect, useRef, useState } from "react";

interface EventSourceOptions {
  onMessage?: (event: MessageEvent) => void;
  onEvent?: Record<string, (event: MessageEvent) => void>;
  autoReconnect?: boolean;
}

export function useEventSource(url: string | null, options: EventSourceOptions = {}) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [lastData, setLastData] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      setStatus("connecting");
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
      };

      es.onmessage = (event) => {
        setLastData(event.data);
        if (options.onMessage) options.onMessage(event);
      };

      es.onerror = (error) => {
        console.error("[SSE Error]", error);
        setStatus("disconnected");
        es.close();

        if (options.autoReconnect !== false) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      // Add custom event listeners
      if (options.onEvent) {
        Object.entries(options.onEvent).forEach(([eventName, handler]) => {
          es.addEventListener(eventName, handler as any);
        });
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [url]);

  return { status, lastData };
}
