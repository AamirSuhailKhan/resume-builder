"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex w-full gap-1 rounded-lg border border-border bg-surface-muted p-1", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-premium",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-md border border-border bg-surface-elevated shadow-sm"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative z-10 truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
