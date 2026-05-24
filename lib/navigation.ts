import {
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  CalendarClock,
  CircleDollarSign,
  CloudLightning,
  FileText,
  GitBranch,
  GraduationCap,
  KanbanSquare,
  Mail,
  MailCheck,
  Scale,
  ScanText,
  Sparkles,
  Trophy,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  stage: string;
  label: string;
  color: string;
  items: NavItem[];
};

export const NAV_ITEMS: NavGroup[] = [
  {
    stage: "1",
    label: "Find",
    color: "text-blue-500",
    items: [
      { title: "Job Matches", href: "/matches", icon: BriefcaseBusiness },
      { title: "Market Weather", href: "/market-weather", icon: CloudLightning },
      { title: "FAANG India Track", href: "/india-track", icon: Trophy },
    ],
  },
  {
    stage: "2",
    label: "Apply",
    color: "text-violet-500",
    items: [
      { title: "Resume Builder", href: "/builder", icon: FileText },
      { title: "ATS Optimizer", href: "/ats", icon: ScanText },
      { title: "Cover Letter", href: "/cover-letter", icon: Mail },
      { title: "Auto Apply", href: "/auto-apply", icon: MailCheck },
      { title: "Applications", href: "/applications", icon: KanbanSquare },
    ],
  },
  {
    stage: "3",
    label: "Prepare",
    color: "text-teal-500",
    items: [
    { title: "InterviewAI", href: "/interview-ai", icon: UserRoundSearch },
      { title: "Skill Gap", href: "/skill-gap", icon: GraduationCap },
      { title: "Career Coach", href: "/coach", icon: Sparkles, badge: "AI" },
    ],
  },
  {
    stage: "4",
    label: "Decide",
    color: "text-amber-500",
    items: [
      { title: "Negotiate Offer", href: "/negotiation", icon: CircleDollarSign },
      { title: "CTC Decoder", href: "/ctc-decoder", icon: Calculator },
      { title: "Compare Offers", href: "/compare-offers", icon: Scale },
      { title: "Hiring Timing", href: "/timing", icon: CalendarClock },
    ],
  },
  {
    stage: "5",
    label: "Track",
    color: "text-slate-400",
    items: [
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];
