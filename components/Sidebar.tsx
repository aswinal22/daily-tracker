"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📋", exact: true },
  { href: "/dashboard/add", label: "Add Task", icon: "➕" },
  { href: "/dashboard/scratchpad", label: "Scratchpad", icon: "📝" },
  { href: "/dashboard/revision", label: "Revision", icon: "📚" },
  { href: "/dashboard/quiz", label: "Quiz", icon: "🧠" },
  { href: "/dashboard/insights", label: "Insights", icon: "📊" },
  { href: "/dashboard/archive", label: "Archive", icon: "🗄️" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

interface SidebarProps {
  onNavigate?: () => void; // close mobile drawer
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1.5 overflow-y-auto scrollbar-thin p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-3 px-3 py-3 rounded-2xl transition hover:bg-card/40 border border-transparent hover:border-border/40 shrink-0"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-lg shadow-md text-white">
          📋
        </span>
        <span className="font-extrabold tracking-tight text-slate-900 dark:text-white">
          Daily Tracker
        </span>
      </Link>

      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 border ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500/10 to-violet-600/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 dark:border-indigo-400/20"
                  : "border-transparent text-muted-foreground hover:bg-card/45 hover:text-slate-900 dark:hover:text-zinc-100 hover:border-border/40"
              }`}
            >
              <span className={`text-lg transition-transform ${isActive ? "scale-110" : ""}`}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
