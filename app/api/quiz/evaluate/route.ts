import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  resolveAIConfig,
  evaluateShortAnswer,
} from "@/lib/ai";
import { validate, quizEvaluateSchema } from "@/lib/validations";
import { weekStartUTC } from "@/lib/utils";
import type { Profile, QuizResult, QuizData, QuizQuestion } from "@/types";

/**
 * POST /api/quiz/evaluate — evaluate quiz answers and store the result.
 *
 * Body: { questions: [...], topics: [...] }
 *
 * Evaluation:
 *   - MCQ: exact string match with correct_answer
 *   - Short answer: LLM semantic grading (core concept, not exact match)
 *
 * Stores the result in quiz_results and returns the full graded quiz.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const result = validate(quizEvaluateSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { questions, topics } = result.data;

  // Fetch profile for AI config (needed for short-answer grading)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  let config = null;
  try {
    if (profile) config = resolveAIConfig(profile);
  } catch {
    // AI not configured — will only be able to grade MCQ, not short answers
  }

  // Evaluate each question
  const evaluatedQuestions: QuizQuestion[] = [];
  let correctCount = 0;

  for (const q of questions) {
    const question: QuizQuestion = {
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      user_answer: q.user_answer,
      is_correct: null,
      explanation: "",
    };

    if (!q.user_answer) {
      // Unanswered
      question.is_correct = false;
      question.explanation = "No answer submitted.";
      evaluatedQuestions.push(question);
      continue;
    }

    if (q.type === "mcq") {
      // Exact match for MCQ
      question.is_correct = q.user_answer === q.correct_answer;
      question.explanation = question.is_correct
        ? "Correct!"
        : `The correct answer is: ${q.correct_answer}`;
    } else if (q.type === "short_answer") {
      // AI semantic grading
      if (config) {
        try {
          const grading = await evaluateShortAnswer(config, {
            question: q.question,
            correctAnswer: q.correct_answer,
            userAnswer: q.user_answer,
          });
          question.is_correct = grading.isCorrect;
          question.explanation = grading.explanation;
        } catch {
          // Fallback: exact match if AI fails
          question.is_correct =
            q.user_answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
          question.explanation = question.is_correct
            ? "Correct (exact match)."
            : `The expected answer is: ${q.correct_answer}`;
        }
      } else {
        // No AI config — exact match fallback
        question.is_correct =
          q.user_answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
        question.explanation = question.is_correct
          ? "Correct (exact match)."
          : `The expected answer is: ${q.correct_answer}. Configure an AI provider for smarter grading.`;
      }
    }

    if (question.is_correct) correctCount++;
    evaluatedQuestions.push(question);
  }

  // Build the full quiz data object
  const mcqCount = evaluatedQuestions.filter((q) => q.type === "mcq").length;
  const shortAnswerCount = evaluatedQuestions.filter(
    (q) => q.type === "short_answer",
  ).length;

  const quizData: QuizData = {
    questions: evaluatedQuestions,
    metadata: {
      generated_at: new Date().toISOString(),
      ai_model: profile?.ai_model || process.env.AI_MODEL || "unknown",
      topics,
      total_questions: evaluatedQuestions.length,
      mcq_count: mcqCount,
      short_answer_count: shortAnswerCount,
    },
  };

  const scorePercent = Math.round((correctCount / evaluatedQuestions.length) * 100);
  const weekOf = weekStartUTC().toISOString().slice(0, 10);

  // Store in quiz_results
  const { data: stored, error } = await supabase
    .from("quiz_results")
    .insert({
      user_id: user.id,
      week_of: weekOf,
      total_questions: evaluatedQuestions.length,
      correct_answers: correctCount,
      score_percent: scorePercent,
      questions_json: quizData,
    })
    .select()
    .single<QuizResult>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(stored);
}

/**
 * GET /api/quiz/evaluate — fetch quiz result history.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false })
    .returns<QuizResult[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
