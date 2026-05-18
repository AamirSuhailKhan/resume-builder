"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { CoachMessage } from "@/components/coach/CoachMessage";
export function CoachChat({
  messages,
  userInitial,
  isLoading,
  onSaveNote,
  coachName,
}: {
  messages: UIMessage[];
  userInitial: string;
  coachName: string;
  isLoading?: boolean;
  onSaveNote?: (content: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-accent">AI Career Coach</p>
        <h2 className="text-lg font-semibold text-foreground">{coachName}</h2>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Ask anything about your job search — rejections, offers, resume, interviews.
          </p>
        )}
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => {
            const isLastAssistant =
              isLoading && index === messages.length - 1 && message.role === "assistant";
            return (
              <CoachMessage
                key={message.id}
                message={message}
                userInitial={userInitial}
                {...(message.role === "assistant" && onSaveNote ? { onSaveNote } : {})}
                {...(isLastAssistant ? { isStreaming: true } : {})}
              />
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
