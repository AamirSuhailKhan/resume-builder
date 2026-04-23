"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  LineChart,
  Settings,
  LogOut,
} from "lucide-react";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Resumes",
    href: "/builder",
    icon: FileText,
  },
  {
    title: "ATS Score",
    href: "/ats",
    icon: LineChart,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-100 bg-white px-3 py-4 flex flex-col">

      {/* LOGO */}
      <div className="mb-8 px-3 py-2">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-lg">
            ResumeAI
          </span>
        </Link>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1">
        {sidebarNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        <button className="group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
          Log out
        </button>
      </div>
    </aside>
  );
}