import { createClient } from "@/lib/supabase/server";
import { formatDate, todayUTC } from "@/lib/utils";
import { TaskListClient } from "./_components/TaskListClient";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("end_date", { ascending: true })
    .order("added_at", { ascending: false });

  const today = todayUTC();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            👋 Welcome back, {profile?.display_name || user.email?.split("@")[0]}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            📅 {formatDate(today.toISOString(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <TaskListClient initialTasks={tasks ?? []} />
    </div>
  );
}
