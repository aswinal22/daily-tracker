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
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2 px-3 py-2 text-lg font-bold"
      >
        <span>📋</span>
        <span>Daily Tracker</span>
      </Link>

      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
