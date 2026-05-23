"use client";

import Link from "next/link";
import { ArrowRight, Flame, Sparkles, TrendingUp, Eye, Calendar, Lightbulb, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WeeklyMomentumCardProps {
  stats: {
    totalApplications: number;
    resumeCount: number;
    upcomingInterview: { company: string; role: string } | null;
    hasPendingApproval: boolean;
  };
}

export function WeeklyMomentumCard({ stats }: WeeklyMomentumCardProps) {
  // Determine the single high-leverage recommended action
  let recommendedAction = {
    title: "Upload your resume to calculate your match score",
    description: "Our parser detects your key engineering signals and compares them to active Bengaluru & remote roles.",
    cta: "Upload Resume",
    href: "/onboarding",
  };

  if (stats.resumeCount > 0 && stats.totalApplications === 0) {
    recommendedAction = {
      title: "Review your top matched job openings",
      description: "You have 3 job matches waiting with direct interview intelligence (e.g. Razorpay LLD prep).",
      cta: "Review Matches",
      href: "/onboarding/matches",
    };
  } else if (stats.upcomingInterview) {
    recommendedAction = {
      title: `Run mock prep for your ${stats.upcomingInterview.company} interview`,
      description: `${stats.upcomingInterview.company} SDE interviews test system scalability. Prep with our custom mock workspace.`,
      cta: "Start Interview Prep",
      href: "/interview",
    };
  } else if (stats.hasPendingApproval) {
    recommendedAction = {
      title: "Approve pending outreach drafts",
      description: "Your outreach agent has generated 3 high-response rate LinkedIn drafts for local hiring managers.",
      cta: "Approve Outreach",
      href: "/applications",
    };
  } else if (stats.totalApplications > 0) {
    recommendedAction = {
      title: "Optimize resume signals to increase response rates",
      description: "Resolving 3 critical gaps on your current resume will boost matching scores from 74% to 88%.",
      cta: "Optimize Gaps",
      href: "/builder",
    };
  }

  // Momentum list items
  const momentumItems = [
    {
      icon: Flame,
      iconBg: "bg-orange-500/10 text-orange-500",
      text: stats.totalApplications > 0 
        ? `${stats.totalApplications} applications sent this week (You are in the top 10% of active candidates)`
        : "Start your application journey (Bengaluru & Remote tech hiring is active)",
    },
    {
      icon: TrendingUp,
      iconBg: "bg-emerald-500/10 text-emerald-500",
      text: stats.resumeCount > 0
        ? "Resume signals improved +9% after parsing optimization"
        : "Resume score ready to be computed (ATS alignment analysis)",
    },
    {
      icon: Eye,
      iconBg: "bg-indigo-500/10 text-indigo-500",
      text: stats.totalApplications > 0 
        ? "3 recruiter views on your matching applications"
        : "Recruiter profile tracking active",
    },
    {
      icon: Calendar,
      iconBg: "bg-rose-500/10 text-rose-500",
      text: stats.upcomingInterview 
        ? `1 upcoming interview scheduled at ${stats.upcomingInterview.company}`
        : "No interviews scheduled yet (Prep modules are active)",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Left Column: Momentum Feed */}
      <div className="md:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Flame className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-semibold text-foreground">Your Momentum This Week</h2>
          </div>

          <div className="grid gap-4 mt-2">
            {momentumItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground leading-relaxed mt-1">
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Local Market Alert Callout */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="grid gap-1 text-xs text-foreground leading-relaxed w-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-primary">India Tech Hiring Intel</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/70 bg-primary/10 px-2 py-0.5 rounded border border-primary/10">
                Source: 8 recent candidates • Updated Today
              </span>
            </div>
            <span>Razorpay recently updated its Round 2 Low-Level Design (LLD) checklist. Expect heavy testing on class diagrams and concurrency patterns.</span>
          </div>
        </div>
      </div>

      {/* Right Column: Single Recommendation Call Action */}
      <div className="md:col-span-1 rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm flex flex-col justify-between">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-foreground">Recommended Next Action</h2>
          </div>

          <div className="grid gap-2">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {recommendedAction.title}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {recommendedAction.description}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link href={recommendedAction.href}>
            <Button className="w-full bg-primary hover:bg-primary/95 text-white font-medium shadow-md shadow-primary/20 justify-between">
              <span>{recommendedAction.cta}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
