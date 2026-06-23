import { todayUTC } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, ArchivedTask } from "@/types";

/**
 * Archive completed tasks whose completed_at is before today (UTC).
 *
 * Moves them from `tasks` → `archived_tasks` preserving the original id
 * (so voice_note_url stays resolvable per spec §6 voice note lifecycle).
 *
 * Works with either:
 *   - the server client (RLS-scoped to one user — pass userId)
 *   - the admin client (bypasses RLS — pass userId to scope manually)
 */
export async function autoArchive(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const todayStr = todayUTC().toISOString().slice(0, 10);

  // 1. Find completed tasks from previous days
  const { data: toArchive, error: fetchErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .lt("completed_at", todayStr)
    .returns<Task[]>();

  if (fetchErr) throw new Error(`Archive fetch failed: ${fetchErr.message}`);
  if (!toArchive || toArchive.length === 0) return 0;

  // 2. Insert into archived_tasks (preserve original id + voice_note_url)
  const archiveRows: Omit<ArchivedTask, "archived_at">[] = toArchive.map((t) => ({
    id: t.id,
    user_id: t.user_id,
    task_name: t.task_name,
    description: t.description,
    notes: t.notes,
    category: t.category,
    priority: t.priority,
    end_date: t.end_date,
    added_at: t.added_at,
    completed_at: t.completed_at,
    voice_note_url: t.voice_note_url,
  }));

  const { error: insertErr } = await supabase
    .from("archived_tasks")
    .insert(archiveRows);

  if (insertErr) throw new Error(`Archive insert failed: ${insertErr.message}`);

  // 3. Delete from active tasks
  const ids = toArchive.map((t) => t.id);
  const { error: deleteErr } = await supabase
    .from("tasks")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);

  if (deleteErr) throw new Error(`Archive delete failed: ${deleteErr.message}`);

  return toArchive.length;
}
