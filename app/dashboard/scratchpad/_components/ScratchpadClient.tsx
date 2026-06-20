"use client";

import { useState, useCallback } from "react";
import type { ScratchpadEntry } from "@/types";
import { useToast } from "@/components/Toast";
import { formatDateTime } from "@/lib/utils";

interface ScratchpadClientProps {
  initialEntries: ScratchpadEntry[];
}

export function ScratchpadClient({ initialEntries }: ScratchpadClientProps) {
  const [entries, setEntries] = useState<ScratchpadEntry[]>(initialEntries);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/scratchpad");
    if (res.ok) setEntries(await res.json());
  }, []);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim()) return;
      setSubmitting(true);
      const res = await fetch("/api/scratchpad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: text.trim() }),
      });
      setSubmitting(false);
      if (res.ok) {
        setText("");
        showToast("Note added", "success");
        refresh();
      } else {
        showToast("Failed to add note", "error");
      }
    },
    [text, refresh, showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/scratchpad/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Note deleted", "info");
        refresh();
      } else {
        showToast("Failed to delete", "error");
      }
    },
    [refresh, showToast],
  );

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a quick note..."
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "..." : "Add"}
        </button>
      </form>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl">📝</p>
          <h3 className="mt-4 text-lg font-medium">No notes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Jot down anything — it&apos;ll be timestamped automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                📝
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm">{entry.entry}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(entry.created_at)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="shrink-0 px-2 py-1 text-xs text-muted-foreground opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                aria-label="Delete note"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
