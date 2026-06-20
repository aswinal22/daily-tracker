"use client";

import { useState } from "react";
import type { Task } from "@/types";
import { AudioPlayer } from "./AudioPlayer";
import {
  cn,
  priorityBadgeClass,
  categoryBadgeClass,
  CATEGORY_EMOJI,
  dueLabel,
  daysOverdue,
  formatDate,
} from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onComplete?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onMotivate?: (task: Task) => void;
  showActions?: boolean;
}

export function TaskCard({
  task,
  onComplete,
  onDelete,
  onMotivate,
  showActions = true,
}: TaskCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const overdue = daysOverdue(task.end_date) > 0 && task.status === "pending";
  const dueSoon =
    !overdue &&
    task.status === "pending" &&
    daysOverdue(task.end_date) >= -2;

  async function handleAction(
    key: string,
    fn: (task: Task) => void | Promise<void>,
  ) {
    setLoading(key);
    try {
      await fn(task);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md",
        overdue && "border-l-4 border-l-red-500",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-medium",
                task.status === "completed" && "text-muted-foreground line-through",
              )}
            >
              {task.task_name}
            </h3>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                categoryBadgeClass(task.category),
              )}
            >
              {CATEGORY_EMOJI[task.category]} {task.category}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                priorityBadgeClass(task.priority),
              )}
            >
              {task.priority}
            </span>
            <span className="text-muted-foreground">
              📅 {formatDate(task.end_date, "MMM d")}
            </span>
            {overdue ? (
              <span className="font-medium text-red-600 dark:text-red-400">
                ⚠️ {dueLabel(task.end_date, task.status)}
              </span>
            ) : dueSoon ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {dueLabel(task.end_date, task.status)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {dueLabel(task.end_date, task.status)}
              </span>
            )}
          </div>

          {/* Voice note — toggle inline player */}
          {task.voice_note_url && (
            <div className="mt-3">
              {showPlayer ? (
                <AudioPlayer src={task.voice_note_url} className="max-w-xs" />
              ) : (
                <button
                  onClick={() => setShowPlayer(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                >
                  🎤 Play voice note
                </button>
              )}
            </div>
          )}

          {task.completed_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              Completed {formatDate(task.completed_at, "MMM d 'at' h:mm a")}
            </p>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col items-end gap-2">
            {task.status === "pending" && (
              <button
                onClick={() => handleAction("complete", () => onComplete?.(task))}
                disabled={loading === "complete"}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
              >
                {loading === "complete" ? "..." : "✓ Complete"}
              </button>
            )}
            {overdue && onMotivate && (
              <button
                onClick={() => handleAction("motivate", () => onMotivate?.(task))}
                disabled={loading === "motivate"}
                className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
              >
                {loading === "motivate" ? "..." : "🤖 Motivate Me"}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => handleAction("delete", () => onDelete?.(task))}
                disabled={loading === "delete"}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:text-red-600 disabled:opacity-50"
                aria-label="Delete task"
              >
                {loading === "delete" ? "..." : "🗑️"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
