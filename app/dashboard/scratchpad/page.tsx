import { createClient } from "@/lib/supabase/server";
import { ScratchpadClient } from "./_components/ScratchpadClient";
import type { ScratchpadEntry } from "@/types";

export default async function ScratchpadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: entries } = await supabase
    .from("scratchpad")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ScratchpadEntry[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📝 Scratchpad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick notes, ideas, and reminders. Timestamped automatically.
        </p>
      </div>
      <ScratchpadClient initialEntries={entries ?? []} />
    </div>
  );
}
