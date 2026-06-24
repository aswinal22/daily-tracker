"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useTheme } from "./ThemeProvider";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  displayName?: string | null;
  email?: string | null;
}

export function Navbar({ displayName, email }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggle, mounted } = useTheme();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border/60 bg-card/90 backdrop-blur-2xl animate-slide-in shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-card/40 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl p-2 transition hover:bg-muted/80 lg:hidden border border-border/50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
            </svg>
          </button>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 lg:hidden">
            Daily Tracker
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="rounded-xl p-2.5 transition bg-card/50 hover:bg-muted border border-border/60 text-sm shadow-sm active:scale-95"
            aria-label="Toggle theme"
          >
            {mounted && (theme === "dark" ? "☀️" : "🌙")}
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl p-1.5 pr-3.5 transition bg-card/50 hover:bg-muted border border-border/60 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-md">
                {initial}
              </span>
              <span className="hidden text-sm font-semibold text-slate-800 dark:text-zinc-200 sm:block">
                {displayName || email?.split("@")[0] || "User"}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-card/90 backdrop-blur-2xl p-1.5 shadow-xl animate-scale-in z-50">
                <div className="border-b border-border/60 px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                    {displayName || "User"}
                  </p>
                  {email && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {email}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-1.5 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
