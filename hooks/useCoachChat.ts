"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo } from "react";

export function useCoachChat(sessionId: string, initialMessages: UIMessage[] = []) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/v1/coach",
        body: { sessionId },
      }),
    [sessionId]
  );

  return useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
  });
}
