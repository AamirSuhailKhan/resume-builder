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
  Network,
  Scale,
  ScanText,
  Sparkles,
  Trophy,
  UserCheck,
  UserRoundSearch,
  ShieldAlert,
  TrendingUp,
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
      { title: "Opportunities", href: "/opportunities", icon: Sparkles, badge: "NEW" },
      { title: "Market", href: "/market-weather", icon: CloudLightning },
    ],
  },
  {
    stage: "2",
    label: "Grow",
    color: "text-purple-500",
    items: [
      { title: "Career Agent", href: "/agent", icon: BrainCircuit, badge: "AUTO" },
      { title: "Skill Gap", href: "/skill-gap", icon: GraduationCap },
      { title: "Career Graph", href: "/career-graph", icon: GitBranch },
    ],
  },
  {
    stage: "3",
    label: "Apply",
    color: "text-violet-500",
    items: [
      { title: "Resume", href: "/builder", icon: FileText },
      { title: "ATS", href: "/ats", icon: ScanText },
      { title: "Applications", href: "/applications", icon: KanbanSquare },
    ],
  },
  {
    stage: "4",
    label: "Prepare",
    color: "text-teal-500",
    items: [
      { title: "Interview AI", href: "/interview-ai", icon: UserRoundSearch },
    ],
  },
  {
    stage: "5",
    label: "Negotiate",
    color: "text-amber-500",
    items: [
      { title: "Offers", href: "/negotiation", icon: CircleDollarSign },
    ],
  },
  {
    stage: "6",
    label: "Track",
    color: "text-slate-400",
    items: [
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

