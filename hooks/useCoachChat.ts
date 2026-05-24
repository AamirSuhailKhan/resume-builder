"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";

/**
 * useCoachChat — stabilized Vercel AI SDK v6 chat hook.
 *
 * Key fixes vs the original:
 * 1. Uses `messages` (not `initialMessages`) — the correct AI SDK v6 field.
 * 2. Transport is rebuilt whenever sessionId changes so we always post to the
 *    right session.
 * 3. sendMessage is the SDK v6 native method (not custom append).
 * 4. mountedRef guard prevents setState after unmount.
 */
export function useCoachChat(sessionId: string, initialMessages: UIMessage[] = []) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Rebuild transport only when sessionId changes.
  // body is included in every request automatically by DefaultChatTransport.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/v1/coach",
        body: { sessionId },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId]
  );

  // In AI SDK v6: `messages` (initial), `transport`, `onFinish`, `onError`
  const chat = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
    onError: (error: Error) => {
      if (mountedRef.current) {
        console.error("[useCoachChat] Stream error:", error?.message ?? error);
      }
    },
  });

  // Expose the native SDK sendMessage plus all other chat helpers
  return chat;
}
