"use client";

import { useState } from "react";
import type { ArchivedTask } from "@/types";
import { AudioPlayer } from "@/components/AudioPlayer";
import {
  cn,
  categoryBadgeClass,
  priorityBadgeClass,
  CATEGORY_EMOJI,
  formatDate,
} from "@/lib/utils";

interface ArchiveClientProps {
  initialTasks: ArchivedTask[];
}

export function ArchiveClient({ initialTasks }: ArchiveClientProps) {
  const [filter, setFilter] = useState<string>("all");

  const categories = ["all", "Upskillment", "Personal", "Health"];
  const filtered =
    filter === "all"
      ? initialTasks
      : initialTasks.filter((t) => t.category === filter);

  if (initialTasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-4xl">🗄️</p>
        <h3 className="mt-4 text-lg font-medium">Archive is empty</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed tasks from previous days will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              filter === cat
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {cat === "all" ? "All" : `${CATEGORY_EMOJI[cat] || ""} ${cat}`}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-muted-foreground line-through">
                  {task.task_name}
                </h3>
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
                    📅 Due: {formatDate(task.end_date, "MMM d")}
                  </span>
                </div>

                {task.completed_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ✓ Completed {formatDate(task.completed_at, "MMM d")}
                  </p>
                )}

                {task.voice_note_url && (
                  <div className="mt-3">
                    <AudioPlayer src={task.voice_note_url} className="max-w-xs" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No archived tasks in this category.
        </p>
      )}
    </div>
  );
}
