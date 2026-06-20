import { createClient } from "@/lib/supabase/server";
import { ArchiveClient } from "./_components/ArchiveClient";
import type { ArchivedTask } from "@/types";

export default async function ArchivePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: archived } = await supabase
    .from("archived_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("archived_at", { ascending: false })
    .returns<ArchivedTask[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🗄️ Archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your completed tasks from previous days. Voice notes are preserved.
        </p>
      </div>
      <ArchiveClient initialTasks={archived ?? []} />
    </div>
  );
}
