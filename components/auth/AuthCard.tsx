import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Shared card wrapper for all auth pages (login, signup, forgot-password). */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center mesh-gradient relative overflow-hidden px-4 py-12">
      {/* Decorative background grid and glowing circles */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        <div className="mb-8 text-center animate-fade-in">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl shadow-inner border border-indigo-500/20 mb-2">
            📋
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-zinc-300">
            Daily Tracker
          </h1>
          <p className="text-xs text-muted-foreground tracking-wide mt-1 uppercase">Next-Gen Workspace</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-xl border border-border animate-scale-in">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{title}</h2>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

