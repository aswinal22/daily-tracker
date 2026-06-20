import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validate, revisionUpdateSchema } from "@/lib/validations";
import { weekStartUTC } from "@/lib/utils";
import type { Task, RevisionStreak } from "@/types";

/**
 * GET /api/revision — fetch this week's completed Upskillment tasks for revision.
 * Returns tasks completed this week (Mon-Sun UTC) in the Upskillment category.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // This week's completed Upskillment tasks (not yet revised)
  const weekStart = weekStartUTC().toISOString().slice(0, 10);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("category", "Upskillment")
    .eq("status", "completed")
    .gte("completed_at", weekStart)
    .order("completed_at", { ascending: true })
    .returns<Task[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch the streak
  const { data: streak } = await supabase
    .from("revision_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single<RevisionStreak>();

  return NextResponse.json({
    tasks: tasks || [],
    streak: streak || { current_streak: 0, longest_streak: 0 },
  });
}

/**
 * PATCH /api/revision — mark a task as revised or "revise later".
 *
 * When ALL tasks are marked revised, update the streak.
 */
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(revisionUpdateSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { task_id, action } = result.data;
  const weekStart = weekStartUTC().toISOString().slice(0, 10);

  if (action === "revised") {
    // Mark as revised with this week's revision date
    const { error } = await supabase
      .from("tasks")
      .update({ revised: true, revision_week: weekStart })
      .eq("id", task_id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Check if ALL this week's tasks are now revised → update streak
    const { data: remaining } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", "Upskillment")
      .eq("status", "completed")
      .eq("revised", false)
      .gte("completed_at", weekStart);

    if (remaining && remaining.length === 0) {
      // All revised! Update streak.
      await updateStreak(supabase, user.id);
    }

    return NextResponse.json({ revised: true });
  }

  // action === "later" — leave revised=false, it carries to next week
  return NextResponse.json({ revised: false });
}

/** Update (or create) the revision streak for a completed revision session. */
async function updateStreak(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("revision_streaks")
    .select("*")
    .eq("user_id", userId)
    .single<RevisionStreak>();

  if (!existing) {
    // Create new streak
    await supabase.from("revision_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_revised_at: now,
    });
    return;
  }

  // Check if the last revision was within the last week already
  // (avoid double-incrementing within the same week)
  const lastRevised = existing.last_revised_at
    ? new Date(existing.last_revised_at)
    : null;
  const thisWeekStart = weekStartUTC();

  if (lastRevised && lastRevised >= thisWeekStart) {
    // Already revised this week — just update the timestamp
    await supabase
      .from("revision_streaks")
      .update({ last_revised_at: now })
      .eq("user_id", userId);
    return;
  }

  // Increment streak
  const newCurrent = existing.current_streak + 1;
  const newLongest = Math.max(newCurrent, existing.longest_streak);

  await supabase
    .from("revision_streaks")
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_revised_at: now,
    })
    .eq("user_id", userId);
}
