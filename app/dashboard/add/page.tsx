"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { CATEGORIES, PRIORITIES } from "@/types";

export default function AddTaskPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Upskillment");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("Medium");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_name: taskName,
        description: description.trim() || null,
        category,
        priority,
        end_date: endDate || todayStr,
      }),
    });

    if (res.ok) {
      showToast("✓ Task added!", "success");
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Failed to add task", "error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">➕ Add Task</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a new task with a deadline.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Task name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="e.g. Learn FastAPI basics"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Description
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional — what you plan to learn or do)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Study path params, query params, request bodies, and response models. Build a small CRUD API for practice."
            rows={3}
            className="w-full resize-y rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The AI uses this to generate better quiz questions during revision.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    category === c
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    priority === p
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            End date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={endDate}
            min={todayStr}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent px-6 py-2.5 font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Task"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-border px-6 py-2.5 font-medium transition hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
