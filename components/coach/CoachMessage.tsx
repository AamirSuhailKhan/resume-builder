"use client";

import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CoachAvatar } from "@/components/coach/CoachAvatar";
import { Button } from "@/components/ui/button";
import { stripCoachMeta } from "@/lib/coach/mock-interview";
import { cn } from "@/lib/utils";

function getMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join("") ?? ""
  );
}

export function CoachMessage({
  message,
  userInitial,
  onSaveNote,
  isStreaming,
}: {
  message: UIMessage;
  userInitial: string;
  onSaveNote?: (content: string) => void;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const rawText = getMessageText(message);
  const text = isUser ? rawText : stripCoachMeta(rawText);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
          {userInitial}
        </div>
      ) : (
        <CoachAvatar {...(isStreaming ? { pulsing: true } : {})} />
      )}
      <div className={cn("max-w-[min(80%,42rem)] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-accent/15 text-foreground"
              : "border border-border bg-surface-muted text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-headings:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle" />
              )}
            </div>
          )}
        </div>
        {!isUser && text && !isStreaming && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={copy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              Copy
            </Button>
            {onSaveNote && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSaveNote(text)}>
                Save to notes
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
