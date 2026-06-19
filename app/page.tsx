import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white dark:from-indigo-950/20 dark:via-background dark:to-background">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">
        <span className="mb-6 text-6xl">📋</span>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Daily Task Dashboard
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Stay on top of your tasks, get AI-powered motivation when you fall
          behind, lock in what you learn with weekend revision quizzes, and
          visualize your progress over time.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:opacity-90"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-border px-6 py-3 font-medium transition hover:bg-muted"
          >
            Create an account
          </Link>
        </div>

        <div className="mt-20 grid w-full gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["🎯", "Smart deadlines", "Color-coded priority badges and overdue alerts keep urgent work visible."],
            ["🤖", "AI motivation", "Personalized, encouraging emails when a task slips past its deadline."],
            ["📚", "Weekend revision", "A spaced-repetition review of your upskilling tasks, capped with an AI quiz."],
            ["🎤", "Voice notes", "Capture a quick summary on any completed task — playable everywhere."],
            ["📊", "Insights", "Completion trends, category breakdowns, quiz progression, and a streak heatmap."],
            ["🌙", "Light & dark", "A clean, responsive UI that works just as well on your phone as your laptop."],
          ].map(([emoji, title, body]) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="text-2xl">{emoji}</div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
