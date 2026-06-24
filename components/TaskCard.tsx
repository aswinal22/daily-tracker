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
  onNotesUpdate?: (taskId: string, notes: string) => Promise<void>;
  showActions?: boolean;
}

export function TaskCard({
  task,
  onComplete,
  onDelete,
  onMotivate,
  onNotesUpdate,
  showActions = true,
}: TaskCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(task.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

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

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await onNotesUpdate?.(task.id, notesValue.trim());
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div
      className={cn(
        "glass-panel glass-card-hover rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300",
        overdue && "border-l-4 border-l-red-500 shadow-[0_8px_30px_rgba(239,68,68,0.05)] dark:shadow-[0_8px_30px_rgba(239,68,68,0.12)]",
        dueSoon && "border-l-4 border-l-amber-500 shadow-[0_8px_30px_rgba(245,158,11,0.04)]",
        task.status === "completed" && "opacity-85 border-l-4 border-l-emerald-500/40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3
              className={cn(
                "font-bold text-lg text-slate-800 dark:text-zinc-100 tracking-tight",
                task.status === "completed" && "text-muted-foreground line-through opacity-75 font-semibold",
              )}
            >
              {task.task_name}
            </h3>
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold shadow-sm",
                categoryBadgeClass(task.category),
              )}
            >
              {CATEGORY_EMOJI[task.category]} {task.category}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold shadow-sm",
                priorityBadgeClass(task.priority),
              )}
            >
              {task.priority}
            </span>
            <span className="text-muted-foreground font-medium flex items-center gap-1 bg-card/45 px-2 py-1 rounded-lg border border-border/50">
              📅 {formatDate(task.end_date, "MMM d")}
            </span>
            {overdue ? (
              <span className="font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                ⚠️ {dueLabel(task.end_date, task.status)}
              </span>
            ) : dueSoon ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                {dueLabel(task.end_date, task.status)}
              </span>
            ) : (
              <span className="text-muted-foreground font-medium bg-card/45 px-2 py-1 rounded-lg border border-border/50">
                {dueLabel(task.end_date, task.status)}
              </span>
            )}
          </div>

          {/* Voice note — toggle inline player */}
          {task.voice_note_url && (
            <div className="mt-4">
              {showPlayer ? (
                <div className="p-1 rounded-2xl bg-muted/30 border border-border/50 max-w-sm">
                  <AudioPlayer src={task.voice_note_url} className="w-full" />
                </div>
              ) : (
                <button
                  onClick={() => setShowPlayer(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/50 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:bg-muted shadow-sm transition active:scale-95"
                >
                  🎤 Play voice note
                </button>
              )}
            </div>
          )}

          {/* Learning notes — show if present, or allow editing on completed tasks */}
          {(task.notes || (task.status === "completed" && onNotesUpdate)) && (
            <div className="mt-4">
              {editingNotes ? (
                <div className="space-y-2.5 max-w-xl">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="What did you learn?"
                    rows={3}
                    autoFocus
                    className="w-full resize-y rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-md shadow-indigo-500/10 hover:opacity-95 transition active:scale-95 disabled:opacity-50"
                    >
                      {savingNotes ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesValue(task.notes || "");
                      }}
                      className="rounded-xl border border-border/80 bg-card/45 px-4 py-2 text-xs font-bold transition hover:bg-muted active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : task.notes ? (
                <div
                  className="cursor-pointer rounded-2xl bg-muted/40 hover:bg-muted/60 p-4 text-sm border border-border/40 transition"
                  onClick={() => onNotesUpdate && setEditingNotes(true)}
                >
                  <p className="mb-1 text-xs font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>📝</span> Learning Notes (Click to Edit):
                  </p>
                  <p className="whitespace-pre-wrap text-slate-700 dark:text-zinc-300 leading-relaxed">{task.notes}</p>
                </div>
              ) : (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline hover:text-accent/90"
                >
                  ✨ Add learning notes
                </button>
              )}
            </div>
          )}

          {task.completed_at && (
            <p className="mt-3.5 text-xs text-muted-foreground font-medium flex items-center gap-1 opacity-80">
              <span>🎉</span> Completed {formatDate(task.completed_at, "MMM d 'at' h:mm a")}
            </p>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            {task.status === "pending" && (
              <button
                onClick={() => handleAction("complete", () => onComplete?.(task))}
                disabled={loading === "complete"}
                className="rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-4 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-sm"
              >
                {loading === "complete" ? "..." : "✓ Complete"}
              </button>
            )}
            {overdue && onMotivate && (
              <button
                onClick={() => handleAction("motivate", () => onMotivate?.(task))}
                disabled={loading === "motivate"}
                className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 px-4 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-sm"
              >
                {loading === "motivate" ? "..." : "🤖 Motivate Me"}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => handleAction("delete", () => onDelete?.(task))}
                disabled={loading === "delete"}
                className="rounded-xl p-2 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition active:scale-95 disabled:opacity-50"
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
