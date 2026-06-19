import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  differenceInCalendarDays,
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from "date-fns";

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Date helpers ───────────────────────────────────────────
// All "today / week / overdue" logic uses UTC midnight as the reference,
// matching the spec's decision (no per-user timezone; single global UTC cron).

/** A Date normalized to midnight UTC. */
export function startOfDayUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Today at UTC midnight — the reference point for overdue/archive logic. */
export function todayUTC(): Date {
  return startOfDayUTC(new Date());
}

/** Whole days between an end date and today (UTC). >0 means overdue. */
export function daysOverdue(endDate: string | Date): number {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  return differenceInCalendarDays(todayUTC(), startOfDayUTC(end));
}

/** A pending task whose end date is before today. */
export function isOverdue(endDate: string | Date, status: string): boolean {
  return status === "pending" && daysOverdue(endDate) > 0;
}

/** Days remaining until deadline (negative = overdue). */
export function daysUntil(endDate: string | Date): number {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  return differenceInCalendarDays(startOfDayUTC(end), todayUTC());
}

// Week = Monday → Sunday, computed in UTC (spec).
export function weekStartUTC(d: Date = new Date()): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}
export function weekEndUTC(d: Date = new Date()): Date {
  return endOfWeek(d, { weekStartsOn: 1 });
}

/** Is the given date within the current Mon–Sun week (UTC)? */
export function isThisWeek(date: string | Date): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return isWithinInterval(d, { start: weekStartUTC(), end: weekEndUTC() });
}

export function formatDate(date: string | Date, fmt = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/** Human label like "2 days overdue" / "Due today" / "in 3 days". */
export function dueLabel(endDate: string | Date, status: string): string {
  const days = daysUntil(endDate);
  if (status === "completed") return "Completed";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `in ${days} days`;
}

// ─── Display helpers (full class strings so Tailwind JIT picks them up) ──

export const PRIORITY_BADGE: Record<string, string> = {
  High: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  Medium:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
};

export const PRIORITY_DOT: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

export const CATEGORY_BADGE: Record<string, string> = {
  Upskillment: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
  Personal: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  Health: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
};

export function priorityBadgeClass(priority: string): string {
  return PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.Medium;
}
export function categoryBadgeClass(category: string): string {
  return CATEGORY_BADGE[category] ?? CATEGORY_BADGE.Personal;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Upskillment: "📚",
  Personal: "🏠",
  Health: "💪",
};

export const PRIORITY_EMOJI: Record<string, string> = {
  High: "🔴",
  Medium: "🟡",
  Low: "🟢",
};
