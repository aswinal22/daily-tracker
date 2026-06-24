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

type Phase = "revising" | "quiz-prompt" | "done";

export function RevisionClient({
  initialTasks,
  initialStreak,
}: RevisionClientProps) {
  const [tasks] = useState(initialTasks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("revising");
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
        // Show quiz prompt instead of auto-advancing
        setPhase("quiz-prompt");
      } else {
        showToast("Skipped for now", "info");
        moveToNext();
      }
    },
    [currentTask, showToast],
  );

  const moveToNext = useCallback(() => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex((i) => i + 1);
      setPhase("revising");
    } else {
      setPhase("done");
    }
  }, [currentIndex, tasks.length]);

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <RevisionHeader streak={initialStreak} />
        <div className="glass-panel border-dashed rounded-3xl p-16 text-center shadow-inner flex flex-col items-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl shadow-inner border border-indigo-500/20 mb-4">
            📚
          </span>
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">No tasks to revise this week</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
            Complete some Upskillment tasks and they&apos;ll appear here automatically for weekend revision.
          </p>
          <Link
            href="/dashboard/add"
            className="mt-6 inline-flex rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg hover:shadow-indigo-500/10 hover:opacity-95 transition duration-200 active:scale-95"
          >
            + Add Task
          </Link>
        </div>
      </div>
    );
  }

  // All done
  if (phase === "done") {
    return (
      <div className="space-y-6">
        <RevisionHeader streak={initialStreak} />
        <div className="glass-panel rounded-3xl p-12 text-center border-l-4 border-l-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.05)] max-w-2xl mx-auto flex flex-col items-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl shadow-inner border border-emerald-500/20 mb-4 animate-pulse">
            🎉
          </span>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">Revision Complete!</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
            Awesome job! You&apos;ve successfully reviewed all {tasks.length} tasks this week.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg hover:shadow-indigo-500/10 hover:opacity-95 transition duration-200 active:scale-95"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RevisionHeader streak={initialStreak} />

      {/* Progress bar */}
      <div className="glass-panel rounded-2xl p-5 shadow-sm border border-border/70">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>
            Topic {currentIndex + 1} of {tasks.length}
          </span>
          <span className="font-extrabold text-indigo-500 dark:text-indigo-400">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner border border-border/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current task card */}
      {currentTask && phase === "revising" && (
        <div className="glass-panel rounded-2xl p-6 shadow-sm border border-border/80">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
              📚 Upskillment
            </span>
            {currentTask.completed_at && (
              <span className="bg-card px-2 py-1 rounded-lg border border-border/50">
                Completed {formatDate(currentTask.completed_at, "MMM d")}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">{currentTask.task_name}</h2>

          {/* Description */}
          {currentTask.description && (
            <div className="mt-4 rounded-xl bg-muted/40 p-4 border border-border/40">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">📋 Description:</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{currentTask.description}</p>
            </div>
          )}

          {/* Learning notes */}
          {currentTask.notes && (
            <div className="mt-4 rounded-xl bg-indigo-500/5 p-4 border border-indigo-500/15">
              <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">📝 What you learned:</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{currentTask.notes}</p>
            </div>
          )}

          {/* Voice note (if exists) */}
          {currentTask.voice_note_url && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">🎤 Your voice note:</p>
              <div className="p-1 rounded-2xl bg-muted/30 border border-border/50 max-w-sm">
                <AudioPlayer src={currentTask.voice_note_url} className="w-full" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => handleAction("revised")}
              disabled={loading !== null}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50"
            >
              {loading === "revised" ? "..." : "✓ Revised"}
            </button>
            <button
              onClick={() => handleAction("later")}
              disabled={loading !== null}
              className="rounded-xl border border-border bg-card/45 px-6 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-50 active:scale-95"
            >
              {loading === "later" ? "..." : "🔁 Revise Later"}
            </button>
          </div>
        </div>
      )}

      {/* Quiz prompt — shown after marking revised */}
      {currentTask && phase === "quiz-prompt" && (
        <div className="glass-panel rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>✓</span> {currentTask.task_name} — marked as revised!
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Take a quick quiz to test your understanding of this topic?
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/dashboard/quiz?taskId=${currentTask.id}`}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground shadow-lg hover:shadow-indigo-500/10 hover:opacity-95 transition active:scale-95"
            >
              🧠 Quiz this topic
            </Link>
            <button
              onClick={moveToNext}
              className="rounded-xl border border-border bg-card/45 px-6 py-2.5 text-sm font-bold transition hover:bg-muted active:scale-95"
            >
              {currentIndex < tasks.length - 1 ? "Next topic →" : "Finish revision"}
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
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">📚 Weekend Revision</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review each topic, then take a quiz to cement your knowledge.
        </p>
      </div>
      {streak.current_streak > 0 && (
        <div className="glass-panel rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-center shadow-sm shrink-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-extrabold text-orange-500 dark:text-orange-400">
            🔥 {streak.current_streak}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">streak</p>
        </div>
      )}
    </div>
  );
}
