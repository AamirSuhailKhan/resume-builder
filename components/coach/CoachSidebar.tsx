"use client";

import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import { ChevronLeft, ChevronRight, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export type SessionListItem = {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
};

type GroupKey = "Today" | "Yesterday" | "This Week" | "Older";

function groupSessions(sessions: SessionListItem[]): Record<GroupKey, SessionListItem[]> {
  const groups: Record<GroupKey, SessionListItem[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  for (const session of sessions) {
    const date = new Date(session.updatedAt);
    if (isToday(date)) groups.Today.push(session);
    else if (isYesterday(date)) groups.Yesterday.push(session);
    else if (isThisWeek(date)) groups["This Week"].push(session);
    else groups.Older.push(session);
  }

  return groups;
}

export function CoachSidebar({
  sessions,
  activeId,
  collapsed,
  onToggleCollapse,
  onNewChat,
  onSelect,
}: {
  sessions: SessionListItem[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
}) {
  const grouped = groupSessions(sessions);

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-border bg-surface py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex flex-1 items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/15"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New conversation
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="ml-2 rounded-lg p-2 text-muted-foreground hover:bg-surface-muted"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {(Object.keys(grouped) as GroupKey[]).map((key) => {
          const items = grouped[key];
          if (items.length === 0) return null;
          return (
            <div key={key} className="mb-4">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {key}
              </p>
              <ul className="space-y-0.5">
                {items.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(session.id)}
                      className={cn(
                        "w-full rounded-lg px-2 py-2 text-left text-sm transition",
                        activeId === session.id
                          ? "bg-surface-elevated ring-1 ring-border"
                          : "hover:bg-surface-muted"
                      )}
                    >
                      <span className="line-clamp-1 font-medium text-foreground">
                        {session.title || "New conversation"}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {session.preview || format(new Date(session.updatedAt), "MMM d")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
