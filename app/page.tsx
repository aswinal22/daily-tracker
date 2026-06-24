import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen mesh-gradient relative overflow-hidden flex flex-col justify-center py-20 px-4">
      {/* Grid overlay for a high-tech developer aesthetic */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-70" />

      {/* Decorative blurred glowing background blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center z-10">
        {/* Top pill badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-indigo-50/50 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-300 backdrop-blur-sm animate-fade-in shadow-sm mb-8">
          <span>⚡</span>
          <span>Next-Generation Productivity Dashboard</span>
        </div>

        <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-zinc-300 py-2">
          Daily Task Dashboard
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
          Stay on top of your tasks, lock in what you learn with AI-generated quizzes, play voice recordings on-demand, and visualize your progress with a developer streak heatmap.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="group relative rounded-xl bg-accent px-8 py-3.5 font-semibold text-accent-foreground shadow-lg hover:shadow-indigo-500/20 transition duration-300 hover:scale-[1.02] flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-1.5">
              Get Started <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-border bg-card/50 hover:bg-card px-8 py-3.5 font-semibold transition duration-300 hover:scale-[1.02] backdrop-blur-sm shadow-sm"
          >
            Create an account
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid w-full gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["🎯", "Smart Deadlines", "Color-coded priority badges and real-time overdue alerts keep urgent tasks front and center."],
            ["🤖", "AI Motivation", "Get personalized, intelligent motivation when you start falling behind your schedules."],
            ["📚", "Weekend Revision", "A structured, spaced-repetition overview of your upskilling tasks to cement your learning."],
            ["🎤", "Voice notes", "Quickly record audio summaries on completed tasks. Play them back anytime, anywhere."],
            ["📊", "Streak Analytics", "Analyze completion trends, category breakdowns, and developer-style contribution heatmaps."],
            ["🌙", "Adaptive Theme", "Beautiful design systems tailored for midnight coding or bright daylight operations."],
          ].map(([emoji, title, body]) => (
            <div
              key={title}
              className="glass-panel glass-card-hover rounded-2xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-2xl shadow-inner border border-indigo-100/20">
                  {emoji}
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

