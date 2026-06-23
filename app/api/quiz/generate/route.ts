// Extend timeout for LLM calls (OpenRouter free models can take 30-60s)
export const maxDuration = 60;

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  resolveAIConfig,
  generateQuiz,
  generateTaskQuiz,
  AIConfigError,
  isRateLimitError,
  getAIErrorMessage,
} from "@/lib/ai";
import { quizDataSchema } from "@/lib/validations";
import { weekStartUTC, formatDate } from "@/lib/utils";
import type { Task, Profile } from "@/types";

/**
 * POST /api/quiz/generate — generate an AI quiz.
 *
 * Modes:
 *   1. Per-task:  { task_id: "uuid" }  → quiz about ONE specific task
 *   2. Combined:  (no body)            → quiz about ALL this week's revised tasks
 *
 * Both use the task's description + notes for contextual questions.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch profile for AI config
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Resolve AI config
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

  // Parse body to check for per-task mode
  const body = await request.json().catch(() => ({}));
  const taskId = body.task_id as string | undefined;

  const weekStart = weekStartUTC().toISOString().slice(0, 10);
  const weekRange = `${formatDate(weekStartUTC(), "MMM d")} – ${formatDate(new Date(), "MMM d")}`;

  let topics: string[];
  let studyContext: string[];

  if (taskId) {
    // ─── Per-task mode ───
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("task_name, description, notes")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single<Pick<Task, "task_name" | "description" | "notes">>();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    topics = [task.task_name];
    let context = task.task_name;
    if (task.description) context += `\n  Description: ${task.description}`;
    if (task.notes) context += `\n  What I learned: ${task.notes}`;
    studyContext = [context];
  } else {
    // ─── Combined mode (all revised tasks this week) ───
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("task_name, description, notes")
      .eq("user_id", user.id)
      .eq("category", "Upskillment")
      .eq("status", "completed")
      .eq("revised", true)
      .gte("completed_at", weekStart)
      .returns<Pick<Task, "task_name" | "description" | "notes">[]>();

    if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: "No revised tasks to quiz on. Complete revision first." },
        { status: 400 },
      );
    }

    topics = tasks.map((t) => t.task_name);
    studyContext = tasks.map((t) => {
      let context = t.task_name;
      if (t.description) context += `\n  Description: ${t.description}`;
      if (t.notes) context += `\n  What I learned: ${t.notes}`;
      return context;
    });
  }

  // Generate quiz (retry on parse failure, but NOT on rate limits)
  let quizData: unknown = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = taskId
        ? await generateTaskQuiz(config, {
            taskName: topics[0],
            studyContext: studyContext[0],
            weekRange,
          })
        : await generateQuiz(config, { topics, studyContext, weekRange });

      // Validate against strict schema
      const result = quizDataSchema.safeParse(raw);
      if (result.success) {
        quizData = result.data;
        break;
      } else {
        lastError = `Quiz schema validation failed: ${result.error.issues.map((i) => i.message).join("; ")}`;
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        return NextResponse.json(
          { error: getAIErrorMessage(err) },
          { status: 429 },
        );
      }
      lastError = getAIErrorMessage(err);
    }
  }

  if (!quizData) {
    return NextResponse.json(
      { error: lastError || "Failed to generate a valid quiz. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(quizData);
}
