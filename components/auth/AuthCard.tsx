import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Shared card wrapper for all auth pages (login, signup, forgot-password). */
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-12 dark:from-indigo-950/20 dark:via-background dark:to-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-5xl">📋</span>
          <h1 className="mt-3 text-2xl font-bold">Daily Task Dashboard</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
