import { createClient } from "@/lib/supabase/server";
import { weekStartUTC } from "@/lib/utils";
import { RevisionClient } from "./_components/RevisionClient";
import type { Task, RevisionStreak } from "@/types";

export default async function RevisionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const weekStart = weekStartUTC().toISOString().slice(0, 10);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("category", "Upskillment")
    .eq("status", "completed")
    .gte("completed_at", weekStart)
    .order("completed_at", { ascending: true })
    .returns<Task[]>();

  const { data: streak } = await supabase
    .from("revision_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single<RevisionStreak>();

  return (
    <RevisionClient
      initialTasks={tasks ?? []}
      initialStreak={{
        current_streak: streak?.current_streak ?? 0,
        longest_streak: streak?.longest_streak ?? 0,
      }}
    />
  );
}
