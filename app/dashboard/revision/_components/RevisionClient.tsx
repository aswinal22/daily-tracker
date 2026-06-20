"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Task } from "@/types";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

interface RevisionClientProps {
  initialTasks: Task[];
  initialStreak: { current_streak: number; longest_streak: number };
}

export function RevisionClient({
  initialTasks,
  initialStreak,
}: RevisionClientProps) {
  const [tasks] = useState(initialTasks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const currentTask = tasks[currentIndex];
  const progress = tasks.length > 0 ? Math.round((currentIndex / tasks.length) * 100) : 0;

  const handleAction = useCallback(
    async (action: "revised" | "later") => {
      if (!currentTask) return;
      setLoading(action);

      const res = await fetch("/api/revision", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: currentTask.id, action }),
      });

      setLoading(null);

      if (!res.ok) {
        showToast("Failed to update", "error");
        return;
      }

      if (action === "revised") {
        showToast("✓ Marked as revised", "success");
      } else {
        showToast("Skipped for now", "info");
      }

      // Move to next
      if (currentIndex < tasks.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setCompleted(true);
      }
    },
    [currentTask, currentIndex, tasks.length, showToast],
  );

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <RevisionHeader streak={initialStreak} />
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl">📚</p>
          <h3 className="mt-4 text-lg font-medium">No tasks to revise this week</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete some Upskillment tasks and they&apos;ll appear here for weekend revision.
          </p>
          <Link
            href="/dashboard/add"
            className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            + Add Task
          </Link>
        </div>
      </div>
    );
  }

  // All revised
  if (completed) {
    return (
      <div className="space-y-6">
        <RevisionHeader streak={initialStreak} />
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-4xl">🎉</p>
          <h3 className="mt-4 text-xl font-bold">Revision Complete!</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve reviewed all {tasks.length} tasks. Ready to test your knowledge?
          </p>
          <Link
            href="/dashboard/quiz"
            className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:opacity-90"
          >
            🧠 Take the Quiz
          </Link>
        </div>
      </div>
    );
  }

  // Active revision
  return (
    <div className="space-y-6">
      <RevisionHeader streak={initialStreak} />

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            {currentIndex + 1} / {tasks.length}
          </span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current task card */}
      {currentTask && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              📚 Upskillment
            </span>
            {currentTask.completed_at && (
              <span>Completed {formatDate(currentTask.completed_at, "MMM d")}</span>
            )}
          </div>

          <h2 className="text-xl font-bold">{currentTask.task_name}</h2>

          {/* Self-check prompt */}
          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Quick self-check:</p>
            <p className="mt-1 text-sm text-muted-foreground">
              What were the key things you learned from this?
            </p>
          </div>

          {/* Voice note (if exists) */}
          {currentTask.voice_note_url && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">🎤 Your voice note:</p>
              <AudioPlayer src={currentTask.voice_note_url} className="max-w-md" />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => handleAction("revised")}
              disabled={loading !== null}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading === "revised" ? "..." : "✓ Revised"}
            </button>
            <button
              onClick={() => handleAction("later")}
              disabled={loading !== null}
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
            >
              {loading === "later" ? "..." : "🔁 Revise Later"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RevisionHeader({
  streak,
}: {
  streak: { current_streak: number; longest_streak: number };
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">📚 Weekend Revision</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review what you learned this week, then take a quiz.
        </p>
      </div>
      {streak.current_streak > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-center dark:border-orange-900 dark:bg-orange-950/30">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            🔥 {streak.current_streak}
          </p>
          <p className="text-xs text-muted-foreground">week streak</p>
        </div>
      )}
    </div>
  );
}
