"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickPrompts } from "@/components/coach/QuickPrompts";

const MAX_CHARS = 2000;

export function CoachInput({
  onSend,
  disabled,
  isLoading,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled || isLoading) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border bg-background/80 p-4 backdrop-blur-sm">
      <QuickPrompts
        {...(disabled || isLoading ? { disabled: true } : {})}
        onSelect={(text) => {
          setValue(text);
          textareaRef.current?.focus();
        }}
      />
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Ask your career coach anything..."
            rows={1}
            className="max-h-24 w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
            {value.length}/{MAX_CHARS}
          </span>
        </div>
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          disabled={disabled || isLoading || !value.trim()}
          onClick={submit}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {isLoading && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Coach is thinking
          <span className="inline-flex">
            <span className="animate-bounce [animation-delay:0ms]">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
        </p>
      )}
    </div>
  );
}
