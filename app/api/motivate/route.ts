// Extend timeout for LLM calls (motivation generation can be slow)
export const maxDuration = 60;

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAIConfig, generateMotivation, AIConfigError } from "@/lib/ai";
import { sendMotivationEmail } from "@/lib/email";
import { validate, motivateSchema } from "@/lib/validations";
import { daysOverdue } from "@/lib/utils";
import type { Task, Profile } from "@/types";

/**
 * POST /api/motivate — generate AI motivation for an overdue task and email it.
 *
 * Body:
 *   { task_id: "uuid" }   — motivate a single task
 *   { bulk: true }        — motivate ALL overdue tasks (one email per task)
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(motivateSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Fetch the user's profile (with AI config + display name + email preferences)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Resolve AI config (user's or env fallback)
  let config;
  try {
    config = resolveAIConfig(profile);
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json(
        { error: "AI provider not configured. Add an API key in Settings." },
        { status: 400 },
      );
    }
    throw err;
  }

  // Fetch the target task(s)
  let tasks: Task[];

  if (result.data.bulk) {
    // All overdue tasks for this user
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("end_date", todayStr)
      .returns<Task[]>();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    tasks = data || [];
  } else {
    // Single task
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", result.data.task_id)
      .eq("user_id", user.id)
      .single<Task>();

    if (error || !data) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    tasks = [data];
  }

  if (tasks.length === 0) {
    return NextResponse.json({ message: "No overdue tasks to motivate." });
  }

  // Generate + send for each task
  const userName = profile.display_name || user.email?.split("@")[0] || "there";
  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      const overdue = daysOverdue(task.end_date);

      // 1. Generate motivation
      const message = await generateMotivation(config, {
        userName,
        taskName: task.task_name,
        category: task.category,
        daysOverdue: overdue,
      });

      // 2. Send email (graceful skip if no Resend key)
      const emailResult = await sendMotivationEmail({
        to: user.email!,
        userName,
        task,
        message,
        daysOverdue: overdue,
      });

      return { task: task.task_name, message, emailSent: emailResult.sent };
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  if (failed.length > 0 && succeeded.length === 0) {
    const firstError = (failed[0] as PromiseRejectedResult).reason;
    return NextResponse.json(
      {
        error: firstError instanceof Error ? firstError.message : "Motivation generation failed",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sent: succeeded.length,
    failed: failed.length,
    messages: succeeded.map(
      (r) => (r as PromiseFulfilledResult<{ task: string; message: string; emailSent: boolean }>).value,
    ),
  });
}
