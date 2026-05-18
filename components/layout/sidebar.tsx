"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Calculator,
  CalendarClock,
  CircleDollarSign,
  FileText,
  GitBranch,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MailCheck,
  RadioTower,
  Scale,
  Settings,
  Sparkles,
  UserRoundSearch,
  CloudLightning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, selectSignOut, useSessionUser } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";

const sidebarNavItems = [
  { title: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { title: "Agent Runs", href: "/agents", icon: GitBranch },
  { title: "Resume Builder", href: "/builder", icon: FileText },
  { title: "Job Intelligence", href: "/job-intelligence", icon: Bot },
  { title: "Job Matches", href: "/matches", icon: BriefcaseBusiness },
  { title: "Auto Apply", href: "/auto-apply", icon: MailCheck },
  { title: "Applications", href: "/applications", icon: KanbanSquare },
  { title: "Negotiate Offer", href: "/negotiation", icon: CircleDollarSign },
  { title: "CTC Decoder", href: "/ctc-decoder", icon: Calculator },
  { title: "Compare Offers", href: "/compare-offers", icon: Scale },
  { title: "Hiring Timing", href: "/timing", icon: CalendarClock },
  { title: "Interview Engine", href: "/interview", icon: UserRoundSearch },
  { title: "Career Coach", href: "/coach", icon: Sparkles },
  { title: "Market Weather", href: "/market-weather", icon: CloudLightning },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Portfolio", href: "/portfolio", icon: RadioTower },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSessionUser();
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
      <Link href="/dashboard" className="mb-5 flex items-center gap-3 rounded-lg px-3 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-elevated shadow-sm">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">ResumeAI</p>
          <p className="mt-1 text-xs text-muted-foreground">Job Operating System</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {sidebarNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                isActive
                  ? "bg-surface-elevated text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-muted-foreground")} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
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
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
