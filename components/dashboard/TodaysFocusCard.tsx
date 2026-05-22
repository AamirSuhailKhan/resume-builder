"use client";

import Link from "next/link";
import { ArrowRight, FileText, Search, MessageSquare, Brain, CircleDollarSign, ShieldAlert } from "lucide-react";

export type FocusState =
  | "no_resume"
  | "no_applications"
  | "has_applications_no_response"
  | "has_interview"
  | "has_offer"
  | "has_pending_approval"
  | "active_search";

interface TodaysFocusCardProps {
  state: FocusState;
  data: {
    interviewCompany?: string | null;
    interviewRole?: string | null;
    totalApplied?: number;
    totalOffers?: number;
    approvalTitle?: string | null;
  };
}

const FOCUS_CONFIG: Record<
  FocusState,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    headline: string;
    subtext: string;
    cta: string;
    href: string;
    urgency: "high" | "medium" | "low";
  }
> = {
  no_resume: {
    icon: FileText,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    headline: "Start by uploading your resume",
    subtext:
      "Upload your existing resume or build one from scratch. It takes 2 minutes and unlocks everything.",
    cta: "Upload resume →",
    href: "/builder",
    urgency: "high",
  },
  no_applications: {
    icon: Search,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    headline: "You haven't applied to anything yet",
    subtext:
      "See your job matches ranked by how well they fit your profile. Apply with one click.",
    cta: "See your top matches →",
    href: "/matches",
    urgency: "high",
  },
  has_applications_no_response: {
    icon: MessageSquare,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    headline: "No responses yet — that is normal",
    subtext:
      "Most responses come in days 5–12 after applying. Sending a follow-up message increases response rate by 40%.",
    cta: "Draft follow-up messages →",
    href: "/applications",
    urgency: "medium",
  },
  has_interview: {
    icon: Brain,
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600",
    headline: "You have an interview coming up",
    subtext:
      "Run a company-specific mock interview, review likely questions, and get your prep score.",
    cta: "Prepare now →",
    href: "/interview",
    urgency: "high",
  },
  has_offer: {
    icon: CircleDollarSign,
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600",
    headline: "You have an offer — do not accept without decoding it",
    subtext:
      "Decode your actual take-home from the CTC, model the equity, and prepare your counter-offer.",
    cta: "Decode your CTC →",
    href: "/ctc-decoder",
    urgency: "high",
  },
  has_pending_approval: {
    icon: ShieldAlert,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    headline: "Your AI agent is waiting for approval",
    subtext:
      "The agent paused and needs your decision before continuing. It expires in 15 minutes.",
    cta: "Review and approve →",
    href: "/agents",
    urgency: "high",
  },
  active_search: {
    icon: Search,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-500",
    headline: "Your search is active",
    subtext:
      "New job matches update daily. Check for fresh matches ranked by your profile fit.",
    cta: "View new matches →",
    href: "/matches",
    urgency: "low",
  },
};

export function TodaysFocusCard({ state, data }: TodaysFocusCardProps) {
  const config = FOCUS_CONFIG[state];
  const Icon = config.icon;

  let headline = config.headline;
  let subtext = config.subtext;

  if (state === "has_interview" && data.interviewCompany) {
    headline = `Interview at ${data.interviewCompany} — prep now`;
    subtext = `You have an interview for ${data.interviewRole ?? "a role"} at ${data.interviewCompany}. Run a company-specific mock session and review their known question types.`;
  }
  if (state === "has_applications_no_response" && data.totalApplied) {
    subtext = `You have applied to ${data.totalApplied} job${data.totalApplied === 1 ? "" : "s"}. ${subtext}`;
  }
  if (state === "has_pending_approval" && data.approvalTitle) {
    headline = `Agent paused: ${data.approvalTitle}`;
  }
  if (state === "has_offer" && data.totalOffers && data.totalOffers > 1) {
    headline = `You have ${data.totalOffers} offers — compare them before deciding`;
    subtext =
      "Use the offer comparison engine to model total compensation, equity, and growth for each.";
  }

  const urgencyBar: Record<typeof config.urgency, string> = {
    high: "bg-red-500",
    medium: "bg-amber-400",
    low: "bg-slate-300 dark:bg-slate-600",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm">
      {/* Urgency indicator strip */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${urgencyBar[config.urgency]}`} />

      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                Today&apos;s focus
              </p>
              <h2 className="text-base font-semibold text-foreground leading-snug">{headline}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{subtext}</p>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href={config.href}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 active:scale-95"
            >
              {config.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
