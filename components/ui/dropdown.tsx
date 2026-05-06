"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type DropdownItem = {
  label: string;
  value: string;
};

export function Dropdown({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label?: string;
  items: DropdownItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.find((item) => item.value === value) ?? items[0];

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition hover:bg-surface-elevated focus-premium"
      >
        <span className="truncate">{active?.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-40 mt-2 w-full min-w-44 overflow-hidden rounded-lg border border-border bg-surface-elevated p-1 shadow-[var(--shadow-card)]"
          >
            {items.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-surface-muted",
                  item.value === value ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
