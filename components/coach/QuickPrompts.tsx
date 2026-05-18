"use client";

const PROMPTS = [
  "Critique my resume",
  "Why am I rejected?",
  "30-day plan",
  "Mock interview me",
  "Salary advice",
] as const;

export function QuickPrompts({ onSelect, disabled }: { onSelect: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2" role="group" aria-label="Quick prompts">
      {PROMPTS.map((label) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(label)}
          className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
