import { createClient } from "@/lib/supabase/server";
import { weekStartUTC } from "@/lib/utils";
import { QuizClient } from "./_components/QuizClient";
import Link from "next/link";

export default async function QuizPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const weekStart = weekStartUTC().toISOString().slice(0, 10);

  // Fetch this week's completed Upskillment tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, revised")
    .eq("user_id", user.id)
    .eq("category", "Upskillment")
    .eq("status", "completed")
    .gte("completed_at", weekStart);

  const totalTasks = tasks?.length ?? 0;
  const revisedTasks = tasks?.filter((t) => t.revised).length ?? 0;
  const allRevised = totalTasks > 0 && revisedTasks === totalTasks;

  // No upskilling tasks this week
  if (totalTasks === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🧠 Knowledge Check</h1>
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl">🧠</p>
          <h3 className="mt-4 text-lg font-medium">No topics to quiz on yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete some Upskillment tasks this week to unlock the quiz.
          </p>
          <Link
            href="/dashboard/add"
            className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            + Add Task
          </Link>
        </div>
      </div>
    );
  }

  // Has tasks but revision not complete — gate the quiz
  if (!allRevised) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🧠 Knowledge Check</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-4xl">🔒</p>
          <h3 className="mt-4 text-lg font-medium">Complete revision first</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            You&apos;ve completed {totalTasks} upskilling task{totalTasks === 1 ? "" : "s"} this week,
            but only revised {revisedTasks} of them.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish your revision session to unlock the quiz.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: totalTasks }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full ${i < revisedTasks ? "bg-emerald-500" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
          <Link
            href="/dashboard/revision"
            className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:opacity-90"
          >
            📚 Go to Revision
          </Link>
        </div>
      </div>
    );
  }

  // All revised — quiz unlocked!
  return <QuizClient />;
}
