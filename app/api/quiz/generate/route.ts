// Extend timeout for LLM calls (OpenRouter free models can take 30-60s)
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAIConfig, generateQuiz, AIConfigError } from "@/lib/ai";
import { quizDataSchema } from "@/lib/validations";
import { weekStartUTC, formatDate } from "@/lib/utils";
import type { Task, Profile } from "@/types";

/**
 * POST /api/quiz/generate — generate an AI quiz from this week's Upskillment topics.
 *
 * Fetches this week's completed (and revised) Upskillment tasks, sends the
 * topics to the LLM, validates the JSON response against the strict schema,
 * and returns it (not yet stored — stored after the user completes it).
 */
export async function POST() {
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

  // Fetch this week's Upskillment tasks
  const weekStart = weekStartUTC().toISOString().slice(0, 10);
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("task_name")
    .eq("user_id", user.id)
    .eq("category", "Upskillment")
    .eq("status", "completed")
    .gte("completed_at", weekStart)
    .returns<Pick<Task, "task_name">[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!tasks || tasks.length === 0) {
    return NextResponse.json(
      { error: "No upskilling tasks completed this week to quiz on." },
      { status: 400 },
    );
  }

  const topics = tasks.map((t) => t.task_name);
  const weekRange = `${formatDate(weekStartUTC(), "MMM d")} – ${formatDate(new Date(), "MMM d")}`;

  // Generate quiz (with retry on parse failure)
  let quizData: unknown = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generateQuiz(config, { topics, weekRange });

      // Validate against strict schema
      const result = quizDataSchema.safeParse(raw);
      if (result.success) {
        quizData = result.data;
        break;
      } else {
        lastError = `Quiz schema validation failed: ${result.error.issues.map((i) => i.message).join("; ")}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Quiz generation failed";
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
