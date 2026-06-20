import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { weekStartUTC } from "@/lib/utils";
import type { Task, ArchivedTask, QuizResult } from "@/types";

/**
 * GET /api/insights — aggregated analytics data for the insights page.
 *
 * Returns data for all 6 charts + summary cards, computed server-side.
 * Supports a time range filter via query param: ?range=week|month|3months|all
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";

  // Determine date range start
  const now = new Date();
  let rangeStart: Date;
  switch (range) {
    case "week":
      rangeStart = weekStartUTC();
      break;
    case "3months":
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case "all":
      rangeStart = new Date(2000, 0, 1);
      break;
    case "month":
    default:
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  // Fetch all tasks (active + archived) for the period
  const { data: activeTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .returns<Task[]>();

  const { data: archivedTasks } = await supabase
    .from("archived_tasks")
    .select("*")
    .eq("user_id", user.id)
    .returns<ArchivedTask[]>();

  const { data: quizResults } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: true })
    .returns<QuizResult[]>();

  const { data: streak } = await supabase
    .from("revision_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // ─── Compute metrics ───
  const allTasks = [...(activeTasks || []), ...(archivedTasks || [])];
  const periodTasks = allTasks.filter(
    (t) => new Date(t.added_at) >= rangeStart,
  );

  // Summary cards
  const totalCompleted = periodTasks.filter((t) => "completed_at" in t && t.completed_at).length;
  const totalTasks = periodTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const currentStreak = streak?.current_streak || 0;
  const avgQuizScore = quizResults && quizResults.length > 0
    ? Math.round(quizResults.reduce((sum, q) => sum + q.score_percent, 0) / quizResults.length)
    : 0;

  // Category breakdown (pie chart)
  const categoryCounts = {
    Upskillment: periodTasks.filter((t) => t.category === "Upskillment").length,
    Personal: periodTasks.filter((t) => t.category === "Personal").length,
    Health: periodTasks.filter((t) => t.category === "Health").length,
  };

  // Completion rate over time (weekly buckets)
  const weeklyCompletion = computeWeeklyBuckets(periodTasks, rangeStart);

  // Overdue trend (tasks that went past deadline, per week)
  const overdueTrend = computeOverdueTrend(periodTasks, rangeStart);

  // Most productive day (day of week distribution)
  const dayOfWeek = computeDayOfWeek(allTasks.filter((t) => t.completed_at));

  // Quiz score progression
  const quizProgression = (quizResults || []).map((q) => ({
    week: q.week_of,
    score: q.score_percent,
  }));

  // Streak heatmap data (daily activity)
  const heatmap = computeHeatmap(allTasks, rangeStart);

  return NextResponse.json({
    summary: {
      completionRate,
      totalCompleted,
      currentStreak,
      avgQuizScore,
    },
    categoryBreakdown: categoryCounts,
    weeklyCompletion,
    overdueTrend,
    dayOfWeek,
    quizProgression,
    heatmap,
    range,
  });
}

// ─── Helpers ───

interface TaskLike {
  added_at: string;
  completed_at?: string | null;
  status?: string;
  end_date: string;
}

function computeWeeklyBuckets(tasks: TaskLike[], rangeStart: Date) {
  const buckets: { week: string; completed: number; total: number }[] = [];
  const now = new Date();
  let cursor = weekStartUTC(rangeStart);

  while (cursor <= now) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekTasks = tasks.filter((t) => {
      const added = new Date(t.added_at);
      return added >= cursor && added < weekEnd;
    });
    const completed = weekTasks.filter(
      (t) => Boolean(t.completed_at),
    ).length;

    buckets.push({
      week: cursor.toISOString().slice(0, 10),
      completed,
      total: weekTasks.length,
    });

    cursor = weekEnd;
  }

  return buckets;
}

function computeOverdueTrend(tasks: TaskLike[], rangeStart: Date) {
  const buckets: { week: string; overdue: number }[] = [];
  const now = new Date();
  let cursor = weekStartUTC(rangeStart);

  while (cursor <= now) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Tasks whose deadline fell within this week AND were overdue
    const overdue = tasks.filter((t) => {
      const endDate = new Date(t.end_date);
      return endDate >= cursor && endDate < weekEnd && endDate < now;
    }).length;

    buckets.push({
      week: cursor.toISOString().slice(0, 10),
      overdue,
    });

    cursor = weekEnd;
  }

  return buckets;
}

function computeDayOfWeek(tasks: { completed_at?: string | null }[]) {
  const days = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  for (const t of tasks) {
    if (t.completed_at) {
      const day = new Date(t.completed_at).getUTCDay();
      days[day]++;
    }
  }
  return {
    Mon: days[1], Tue: days[2], Wed: days[3], Thu: days[4],
    Fri: days[5], Sat: days[6], Sun: days[0],
  };
}

function computeHeatmap(
  tasks: { completed_at?: string | null; added_at: string }[],
  rangeStart: Date,
) {
  const map: Record<string, number> = {};
  const now = new Date();
  const cursor = new Date(rangeStart);

  while (cursor <= now) {
    const dateStr = cursor.toISOString().slice(0, 10);
    map[dateStr] = 0;

    // Count tasks completed on this day
    for (const t of tasks) {
      if (t.completed_at) {
        const compDate = new Date(t.completed_at).toISOString().slice(0, 10);
        if (compDate === dateStr) {
          map[dateStr]++;
        }
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return Object.entries(map).map(([date, count]) => ({ date, count }));
}
