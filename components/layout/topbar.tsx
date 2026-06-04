"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, Menu, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApprovalBell } from "@/components/approvals/ApprovalBell";

const SHOW_TWIN = false; // Hook for future reactivation

const titles: Record<string, string> = {
  "/dashboard": "Command Center",
  "/twin": "AI Career Twin",
  "/builder": "Resume Builder",
  "/ats": "ATS Score",
  "/job-optimizer": "Job Optimizer",
  "/job-intelligence": "Job Intelligence",
  "/opportunities": "Opportunity Intelligence",
  "/matches": "Job Matches",
  "/auto-apply": "Auto Apply",
  "/applications": "Applications",
  "/interview-ai": "InterviewAI",
  "/coach": "Career Coach",
  "/analytics": "Analytics",
  "/portfolio": "Portfolio",
  "/settings": "Settings",
};

const journeyNav = [
  { label: "Mission Control", href: "/dashboard" },
  { label: "Find", href: "/opportunities" },
  { label: "Grow", href: "/agent" },
  { label: "Apply", href: "/builder" },
  { label: "Prepare", href: "/interview-ai" },
  { label: "Negotiate", href: "/negotiation" },
  { label: "Track", href: "/analytics" },
];

export function Topbar() {
  const pathname = usePathname();
  const title = titles[Object.keys(titles).find((href) => pathname.startsWith(href)) ?? "/dashboard"];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-premium flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Daily workflow, matching, and application intelligence.</p>
          </div>
        </div>

        <div className="hidden items-center gap-1 rounded-lg border border-border bg-surface p-1 xl:flex">
          {journeyNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-surface-muted text-foreground"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground md:flex xl:hidden">
          <Search className="h-4 w-4" />
          <span className="flex-1">Search resumes, jobs, applications</span>
          <span className="flex items-center gap-1 rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[11px]">
            <Command className="h-3 w-3" /> K
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="hidden sm:inline-flex">AI queue healthy</Badge>
          <ApprovalBell />
          <Link href="/auto-apply">
            <Button size="sm">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Apply</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
