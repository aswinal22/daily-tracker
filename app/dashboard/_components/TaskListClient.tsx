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
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
            <p className="mb-1 text-sm">
              <span className="font-medium">✓ {voicePromptTask.task_name}</span> completed!
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              ⚠️ Overdue
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {overdueTasks.length}
              </span>
            </h2>
            <button
              onClick={() => handleMotivate({ ...overdueTasks[0], id: "bulk" } as Task)}
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              🤖 Motivate all overdue
            </button>
          </div>
          <div className="space-y-3">
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
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            🟢 Active Tasks
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {nonOverdueActive.length}
            </span>
          </h2>
          <div className="space-y-3">
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
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            ✓ Completed
            <span className="rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
              {completedCount}
            </span>
          </h2>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={handleDelete}
                onNotesUpdate={handleNotesUpdate}
                showActions={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl">📋</p>
          <h3 className="mt-4 text-lg font-medium">No tasks yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first task to get started.
          </p>
          <Link
            href="/dashboard/add"
            className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            + Add New Task
          </Link>
        </div>
      )}
    </div>
  );
}
