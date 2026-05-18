import { cn } from "@/lib/utils";

export function CoachAvatar({ size = "md", pulsing = false }: { size?: "sm" | "md"; pulsing?: boolean }) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <div
      className={cn(
        dim,
        "shrink-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 shadow-md ring-2 ring-violet-500/20",
        pulsing && "animate-pulse"
      )}
      aria-hidden
    />
  );
}
