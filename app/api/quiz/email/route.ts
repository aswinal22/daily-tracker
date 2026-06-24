// Extend timeout for email sending
export const maxDuration = 30;

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendQuizResultsEmail } from "@/lib/email";
import type { QuizResult, Profile } from "@/types";

/**
 * POST /api/quiz/email — email the latest (or specified) quiz result to the user.
 *
 * Body: { result_id?: string }  (optional — defaults to most recent)
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "No email on file" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const resultId = body.result_id as string | undefined;

  // Fetch the quiz result
  let query = supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false })
    .limit(1);

  let quizResult: QuizResult | null = null;

  if (resultId) {
    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("id", resultId)
      .eq("user_id", user.id)
      .single<QuizResult>();
    if (error || !data) {
      return NextResponse.json({ error: "Quiz result not found" }, { status: 404 });
    }
    quizResult = data;
  } else {
    const { data, error } = await query.single<QuizResult>();
    if (error || !data) {
      return NextResponse.json({ error: "No quiz results found" }, { status: 404 });
    }
    quizResult = data;
  }

  // Get user's display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single<Profile>();

  const userName = profile?.display_name || user.email.split("@")[0];

  // Send the email
  const result = await sendQuizResultsEmail({
    to: user.email,
    userName,
    scorePercent: quizResult.score_percent,
    correct: quizResult.correct_answers,
    total: quizResult.total_questions,
    weekOf: quizResult.week_of,
  });

  if (!result.sent) {
    if (result.skipped) {
      return NextResponse.json(
        { error: "Email not configured (RESEND_API_KEY missing). Ask the admin to set it up." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: result.error || "Failed to send email" },
      { status: 500 },
    );
  }

  return NextResponse.json({ sent: true, id: result.id });
}
