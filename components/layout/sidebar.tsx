"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, selectSignOut } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";
import { NAV_ITEMS } from "@/lib/navigation";

interface SidebarProps {
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname() || "";
  const signOut = useAuthStore(selectSignOut);

  const handleSignOut = async () => {
    try {
      useResumeStore.getState().reset();
      await signOut();
    } finally {
      window.location.href = "/login";
    }
  };

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-background/88 px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col">
      {/* Brand logo */}
      <Link href="/dashboard" className="mb-4 flex items-center gap-3 rounded-lg px-3 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-elevated shadow-sm">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">CareerOS</p>
          <p className="mt-1 text-xs text-muted-foreground">Your career, automated</p>
        </div>
      </Link>

      {/* Home button */}
      <Link
        href="/dashboard"
        className={cn(
          "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium mb-3 transition",
          pathname === "/dashboard"
            ? "bg-surface-elevated text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        )}
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        <span>Home</span>
      </Link>

      {/* Journey nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto pr-1 pb-4">
        {NAV_ITEMS.map((group) => (
          <div key={group.stage} className="mb-3">
            {/* Stage header */}
            <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5">
              <span className={cn("text-[10px] font-bold tracking-widest uppercase", group.color)}>
                {group.stage}
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/60">
                {group.label}
              </span>
            </div>
            {/* Group items */}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                    isActive
                      ? "bg-surface-elevated text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-accent" : "text-muted-foreground/70"
                    )}
                  />
                  <span className="truncate flex-1">{item.title}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {user && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">Pro workspace</p>
            </div>
          </div>
        )}
        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
            pathname === "/settings"
              ? "bg-surface-elevated text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
