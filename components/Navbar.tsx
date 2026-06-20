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
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card animate-slide-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 transition hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
            </svg>
          </button>
          <span className="font-semibold lg:hidden">Daily Tracker</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="rounded-lg p-2 transition hover:bg-muted"
            aria-label="Toggle theme"
          >
            {mounted && (theme === "dark" ? "☀️" : "🌙")}
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg p-1 pr-3 transition hover:bg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {initial}
              </span>
              <span className="hidden text-sm font-medium sm:block">
                {displayName || email?.split("@")[0] || "User"}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg animate-scale-in">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium truncate">
                    {displayName || "User"}
                  </p>
                  {email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {email}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
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
