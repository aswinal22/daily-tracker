"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuizQuestion, QuizData } from "@/types";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

export function QuizClient({
  mode = "combined",
  taskId,
  taskName,
}: {
  mode?: "per-task" | "combined";
  taskId?: string;
  taskName?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [phase, setPhase] = useState<"idle" | "generating" | "active" | "submitting">("idle");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setPhase("generating");
    setError(null);

    // Use AbortController with a 55s timeout (leaves headroom under Vercel's 60s limit)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    // Send task_id for per-task mode
    const body = mode === "per-task" && taskId
      ? JSON.stringify({ task_id: taskId })
      : "{}";

    let res: Response;
    try {
      res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      setPhase("idle");
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The AI took too long to respond. Free models can be slow — please try again.");
      } else {
        setError("Network error. Please try again.");
      }
      return;
    }
    clearTimeout(timeout);
    setPhase("idle");

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to generate quiz");
      return;
    }

    const data = (await res.json()) as QuizData;
    setQuizData(data);
    setCurrentQ(0);
    setAnswers({});
    setPhase("active");
    showToast("Quiz generated!", "success");
  }, [showToast]);

  const submit = useCallback(async () => {
    if (!quizData) return;
    setPhase("submitting");

    const questions = quizData.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      user_answer: answers[q.id] || null,
    }));

    const res = await fetch("/api/quiz/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions,
        topics: quizData.metadata.topics,
      }),
    });

    setPhase("idle");

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to evaluate quiz");
      return;
    }

    showToast("Quiz graded!", "success");
    // In per-task mode, go back to revision; in combined mode, show results
    if (mode === "per-task") {
      router.push("/dashboard/revision");
    } else {
      router.push("/dashboard/quiz/results");
    }
  }, [quizData, answers, router, showToast, mode]);

  // ─── Render ───

  // Idle: prompt to generate
  if (phase === "idle" && !quizData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            🧠 {mode === "per-task" && taskName ? `Quiz: ${taskName}` : "Knowledge Check"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "per-task"
              ? "Test your understanding of this specific topic."
              : "Test what you learned this week with an AI-generated quiz."}
          </p>
        </div>
        <div className="glass-panel rounded-3xl p-10 text-center shadow-sm max-w-2xl mx-auto flex flex-col items-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl shadow-inner border border-indigo-500/20 mb-4 animate-bounce">
            🧠
          </span>
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">Ready for your quiz?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            {mode === "per-task"
              ? "5 questions dynamically compiled based on this task's description and your notes."
              : "A custom knowledge check based on all Upskillment tasks you revised this week."}
          </p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            onClick={generate}
            className="mt-8 rounded-xl bg-accent px-6 py-3 font-bold text-accent-foreground shadow-lg hover:shadow-indigo-500/10 hover:opacity-95 transition active:scale-95 duration-200"
          >
            🧠 Generate Quiz
          </button>
          <div className="mt-4">
            <Link
              href="/dashboard/revision"
              className="text-xs font-bold text-accent hover:underline"
            >
              ← Back to revision
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generating
  if (phase === "generating") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">🧠 Knowledge Check</h1>
        <div className="glass-panel rounded-3xl p-16 text-center shadow-sm max-w-2xl mx-auto flex flex-col items-center">
          <p className="animate-pulse text-lg font-bold text-indigo-500 dark:text-indigo-400">
            🤖 Generating your quiz...
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
            Free AI models can take 30-60 seconds to structure the questions. Please wait a moment...
          </p>
        </div>
      </div>
    );
  }

  // Submitting
  if (phase === "submitting") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">🧠 Knowledge Check</h1>
        <div className="glass-panel rounded-3xl p-16 text-center shadow-sm max-w-2xl mx-auto flex flex-col items-center">
          <p className="animate-pulse text-lg font-bold text-indigo-500 dark:text-indigo-400">
            🤖 Grading your answers...
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Evaluating conceptual answers semantically...
          </p>
        </div>
      </div>
    );
  }

  // Active quiz
  if (quizData && phase === "active") {
    const question: QuizQuestion = quizData.questions[currentQ];
    const total = quizData.questions.length;
    const isLast = currentQ === total - 1;
    const progress = Math.round(((currentQ + 1) / total) * 100);
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header with progress */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">🧠 Knowledge Check</h1>
          <span className="text-sm font-bold text-muted-foreground bg-card px-3 py-1 rounded-xl border border-border/80 shadow-sm">
            Question {currentQ + 1} of {total}
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner border border-border/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 shadow-md"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="glass-panel rounded-2xl p-6 shadow-sm border border-border/80">
          <div className="mb-4">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
              {question.type === "mcq" ? "Multiple Choice" : "Short Answer"}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 leading-snug">{question.question}</h2>

          {/* MCQ options */}
          {question.type === "mcq" && question.options && (
            <div className="mt-6 space-y-3">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [question.id]: opt })}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left text-sm transition duration-200",
                    answers[question.id] === opt
                      ? "border-indigo-500 bg-indigo-500/10 font-semibold text-indigo-700 dark:text-indigo-300 dark:border-indigo-400"
                      : "border-border hover:bg-muted/80 text-slate-700 dark:text-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition",
                      answers[question.id] === opt
                        ? "border-indigo-500 bg-indigo-500 text-white shadow-sm"
                        : "border-border bg-card/60",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm leading-relaxed">{opt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Short answer input */}
          {question.type === "short_answer" && (
            <div className="mt-5">
              <textarea
                value={answers[question.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                placeholder="Type your explanation here..."
                rows={4}
                className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-sm"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ((i) => Math.max(0, i - 1))}
            disabled={currentQ === 0}
            className="rounded-xl border border-border bg-card/45 px-5 py-2 text-sm font-bold transition hover:bg-muted active:scale-95 disabled:opacity-30"
          >
            ← Previous
          </button>

          {isLast ? (
            <button
              onClick={submit}
              disabled={answeredCount === 0}
              className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50"
            >
              ✓ Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ((i) => Math.min(total - 1, i + 1))}
              className="rounded-xl bg-accent px-6 py-2 text-sm font-bold text-accent-foreground shadow-md hover:opacity-95 transition active:scale-95"
            >
              Next →
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
