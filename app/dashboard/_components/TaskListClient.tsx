"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Task } from "@/types";
import { TaskCard } from "@/components/TaskCard";
import { ProgressBar } from "@/components/ProgressBar";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { isOverdue } from "@/lib/utils";

interface TaskListClientProps {
  initialTasks: Task[];
}

export function TaskListClient({ initialTasks }: TaskListClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [voicePromptTask, setVoicePromptTask] = useState<Task | null>(null);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data = await res.json();
      setTasks(data);
    }
  }, []);

  const handleComplete = useCallback(
    async (task: Task) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        const updated = await res.json();
        showToast("✓ Task completed!", "success");
        // Show voice note prompt if the task didn't already have one
        if (!updated.voice_note_url) {
          setVoicePromptTask(updated);
        }
        refresh();
      } else {
        showToast("Failed to complete task", "error");
      }
    },
    [refresh, showToast],
  );

  const handleDelete = useCallback(
    async (task: Task) => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Task deleted", "info");
        refresh();
      } else {
        showToast("Failed to delete task", "error");
      }
    },
    [refresh, showToast],
  );

  const handleMotivate = useCallback(
    async (task: Task) => {
      showToast("🤖 Generating motivation...", "info");
      const body =
        task.id === "bulk"
          ? { bulk: true }
          : { task_id: task.id };
      const res = await fetch("/api/motivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast("📬 Motivation email sent!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to send motivation", "error");
      }
    },
    [showToast],
  );

  const handleVoiceSaved = useCallback(() => {
    showToast("🎤 Voice note saved!", "success");
    setVoicePromptTask(null);
    refresh();
  }, [refresh, showToast]);

  const handleVoiceSkip = useCallback(() => {
    setVoicePromptTask(null);
  }, []);

  const handleNotesUpdate = useCallback(
    async (taskId: string, notes: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null }),
      });
      if (res.ok) {
        showToast("📝 Notes saved", "success");
        refresh();
      } else {
        showToast("Failed to save notes", "error");
      }
    },
    [refresh, showToast],
  );

  // ─── Derived state ───
  const activeTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const overdueTasks = activeTasks.filter((t) => isOverdue(t.end_date, t.status));
  const nonOverdueActive = activeTasks.filter(
    (t) => !isOverdue(t.end_date, t.status),
  );

  const totalToday = tasks.length;
  const completedCount = completedTasks.length;

  return (
    <div className="space-y-6">
      {/* Today's progress */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Today&apos;s Progress
        </h2>
        <ProgressBar value={completedCount} total={totalToday} />
      </div>

      {/* Voice note prompt modal */}
      <Modal
        open={voicePromptTask !== null}
        onClose={handleVoiceSkip}
        title="🎤 Record a voice note?"
        maxWidth="max-w-lg"
      >
        {voicePromptTask && (
          <div>
            <p className="mb-1.5 text-sm">
              <span className="font-bold">✓ {voicePromptTask.task_name}</span> completed!
            </p>
            <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
              Capture a quick summary of what you did or learned. You can play it
              back later during weekend revision.
            </p>
            <VoiceRecorder
              uploadUrl={`/api/tasks/${voicePromptTask.id}/voice`}
              onSaved={handleVoiceSaved}
              onSkip={handleVoiceSkip}
            />
          </div>
        )}
      </Modal>

      {/* Overdue section */}
      {overdueTasks.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
              <span>⚠️</span> Overdue
              <span className="rounded-lg bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/15">
                {overdueTasks.length}
              </span>
            </h2>
            <button
              onClick={() => handleMotivate({ ...overdueTasks[0], id: "bulk" } as Task)}
              className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 px-3.5 py-1.5 text-xs font-bold transition active:scale-95"
            >
              🤖 Motivate all overdue
            </button>
          </div>
          <div className="space-y-4">
            {overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onMotivate={handleMotivate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Active tasks */}
      {nonOverdueActive.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <span>🟢</span> Active Tasks
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
              {nonOverdueActive.length}
            </span>
          </h2>
          <div className="space-y-4">
            {nonOverdueActive.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed today */}
      {completedTasks.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <span>✓</span> Completed Today
            <span className="rounded-lg bg-card/60 px-2.5 py-0.5 text-xs font-bold text-muted-foreground border border-border/60">
              {completedCount}
            </span>
          </h2>
          <div className="space-y-4">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={handleDelete}
                onNotesUpdate={handleNotesUpdate}
                showActions={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="glass-panel border-dashed rounded-3xl p-16 text-center shadow-inner flex flex-col items-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl shadow-inner border border-indigo-500/20 mb-4">
            📋
          </span>
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">No tasks planned yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
            Organize your day, track priorities, and upskill. Add your first task to get started.
          </p>
          <Link
            href="/dashboard/add"
            className="mt-6 inline-flex rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg hover:shadow-indigo-500/10 hover:opacity-95 transition duration-200 active:scale-95"
          >
            + Add New Task
          </Link>
        </div>
      )}
    </div>
  );
}
