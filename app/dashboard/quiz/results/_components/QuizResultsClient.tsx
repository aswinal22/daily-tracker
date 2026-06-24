"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { QuizResult } from "@/types";
import { useToast } from "@/components/Toast";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface QuizResultsClientProps {
  initialResults: QuizResult[];
}

export function QuizResultsClient({ initialResults }: QuizResultsClientProps) {
  const [results] = useState<QuizResult[]>(initialResults);
  const [selected, setSelected] = useState<QuizResult | null>(initialResults[0] || null);
  const [emailing, setEmailing] = useState(false);
  const { showToast } = useToast();

  const latest = results[0];

  const handleEmail = useCallback(async () => {
    if (!latest) return;
    setEmailing(true);
    showToast("📬 Sending results email...", "info");

    try {
      const res = await fetch("/api/quiz/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: latest.id }),
      });

      if (res.ok) {
        showToast("📬 Check your email for results!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to send email", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
    setEmailing(false);
  }, [latest, showToast]);

  // Empty state
  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🏆 Quiz Results</h1>
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl">🏆</p>
          <h3 className="mt-4 text-lg font-medium">No quiz results yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete a revision quiz to see your results here.
          </p>
          <Link
            href="/dashboard/quiz"
            className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            🧠 Take a Quiz
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏆 Quiz Results</h1>

      {/* Latest result — score card */}
      {latest && (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Latest Quiz</p>
          <p className="mt-2 text-5xl font-bold text-accent">{latest.score_percent}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {latest.correct_answers} / {latest.total_questions} correct
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={handleEmail}
              disabled={emailing}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              📬 Email Results
            </button>
            <Link
              href="/dashboard/quiz"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
            >
              🔁 Retake Quiz
            </Link>
          </div>
        </div>
      )}

      {/* Selected result breakdown */}
      {selected && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">
              Week of {selected.week_of}
            </h2>
            <span className="text-sm text-muted-foreground">
              {formatDateTime(selected.taken_at)}
            </span>
          </div>

          <div className="space-y-3">
            {selected.questions_json.questions.map((q, i) => (
              <div
                key={q.id}
                className={cn(
                  "rounded-lg border p-4",
                  q.is_correct
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm">
                    {q.is_correct ? "✅" : q.user_answer ? "❌" : "⬜"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {i + 1}. {q.question}
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p>
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={q.is_correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
                          {q.user_answer || "(no answer)"}
                        </span>
                      </p>
                      {!q.is_correct && (
                        <p>
                          <span className="text-muted-foreground">Correct: </span>
                          <span className="font-medium">{q.correct_answer}</span>
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        💡 {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History list */}
      {results.length > 1 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            History
          </h2>
          <div className="space-y-2">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left transition",
                  selected?.id === r.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-muted",
                )}
              >
                <div>
                  <p className="text-sm font-medium">Week of {r.week_of}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(r.taken_at)}
                  </p>
                </div>
                <span className={cn(
                  "text-lg font-bold",
                  r.score_percent >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : r.score_percent >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400",
                )}>
                  {r.score_percent}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
