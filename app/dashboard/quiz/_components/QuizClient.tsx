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
          <h1 className="text-2xl font-bold">
            🧠 {mode === "per-task" && taskName ? `Quiz: ${taskName}` : "Knowledge Check"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "per-task"
              ? "Test your understanding of this specific topic."
              : "Test what you learned this week with an AI-generated quiz."}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-4xl">🧠</p>
          <h3 className="mt-4 text-lg font-medium">Ready for your quiz?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {mode === "per-task"
              ? "5 questions based on this task's description and your notes."
              : "The quiz is based on your revised Upskillment tasks this week."}
          </p>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            onClick={generate}
            className="mt-6 rounded-xl bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:opacity-90"
          >
            🧠 Generate Quiz
          </button>
          <div className="mt-4">
            <Link
              href="/dashboard/revision"
              className="text-sm text-accent hover:underline"
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
        <h1 className="text-2xl font-bold">🧠 Knowledge Check</h1>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="animate-pulse text-lg text-muted-foreground">
            🤖 Generating your quiz...
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Free AI models can take 30-60 seconds. Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Submitting
  if (phase === "submitting") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🧠 Knowledge Check</h1>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="animate-pulse text-lg text-muted-foreground">
            🤖 Grading your answers...
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
      <div className="space-y-6">
        {/* Header with progress */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🧠 Knowledge Check</h1>
          <span className="text-sm text-muted-foreground">
            {currentQ + 1} / {total}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-3">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {question.type === "mcq" ? "Multiple Choice" : "Short Answer"}
            </span>
          </div>

          <h2 className="text-lg font-semibold">{question.question}</h2>

          {/* MCQ options */}
          {question.type === "mcq" && question.options && (
            <div className="mt-4 space-y-2">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [question.id]: opt })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                    answers[question.id] === opt
                      ? "border-accent bg-accent/5"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      answers[question.id] === opt
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-mono text-sm">{opt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Short answer input */}
          {question.type === "short_answer" && (
            <div className="mt-4">
              <textarea
                value={answers[question.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                placeholder="Type your answer..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ((i) => Math.max(0, i - 1))}
            disabled={currentQ === 0}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-30"
          >
            ← Previous
          </button>

          {isLast ? (
            <button
              onClick={submit}
              disabled={answeredCount === 0}
              className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              ✓ Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ((i) => Math.min(total - 1, i + 1))}
              className="rounded-xl bg-accent px-6 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
            >
              Next →
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
