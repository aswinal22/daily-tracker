"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { GithubHeatmap } from "@/components/GithubHeatmap";
import { cn } from "@/lib/utils";

type Range = "week" | "month" | "3months" | "all";

interface InsightsData {
  summary: {
    completionRate: number;
    totalCompleted: number;
    currentStreak: number;
    avgQuizScore: number;
  };
  categoryBreakdown: { Upskillment: number; Personal: number; Health: number };
  weeklyCompletion: { week: string; completed: number; total: number }[];
  overdueTrend: { week: string; overdue: number }[];
  dayOfWeek: Record<string, number>;
  quizProgression: { week: string; score: number }[];
  heatmap: { date: string; count: number }[];
  range: string;
}

const PIE_COLORS = ["#818cf8", "#38bdf8", "#2dd4bf"];

export function InsightsClient() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [range, setRange] = useState<Range>("month");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true);
    const res = await fetch(`/api/insights?range=${r}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">📊 Insights</h1>
        <div className="glass-panel rounded-3xl p-20 text-center shadow-sm">
          <p className="animate-pulse font-medium text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  const { summary } = data;
  const categoryData = Object.entries(data.categoryBreakdown).map(([name, value]) => ({
    name,
    value,
  }));
  const dayData = Object.entries(data.dayOfWeek).map(([day, count]) => ({ day, count }));

  return (
    <div className="space-y-8">
      {/* Header + range filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">📊 Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed productivity breakdown and trends.</p>
        </div>
        <div className="flex gap-2 bg-card/45 p-1 rounded-2xl border border-border/80 backdrop-blur-sm shadow-inner">
          {(["week", "month", "3months", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition duration-200 active:scale-95",
                range === r
                  ? "bg-accent text-accent-foreground shadow-md shadow-indigo-500/10"
                  : "text-muted-foreground hover:bg-card hover:text-slate-900 dark:hover:text-zinc-100",
              )}
            >
              {r === "3months" ? "3 Months" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="📈 Completion" value={`${summary.completionRate}%`} />
        <SummaryCard label="🏆 Completed" value={summary.totalCompleted} />
        <SummaryCard label="🔥 Streak" value={`${summary.currentStreak} wk`} />
        <SummaryCard label="🧠 Avg Quiz" value={`${summary.avgQuizScore}%`} />
      </div>

      {/* Completion rate over time */}
      <ChartCard title="📈 Completion Rate Over Time">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.weeklyCompletion}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => w.slice(5)}
              stroke="var(--muted-foreground)"
              fontSize={11}
              fontWeight={600}
            />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} fontWeight={600} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "16px",
                backdropFilter: "blur(12px)",
                boxShadow: "0 10px 30px 0 rgba(0,0,0,0.1)",
              }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#818cf8"
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 1 }}
              activeDot={{ r: 7 }}
              name="Completed"
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="Total"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category breakdown */}
        <ChartCard title="🗂️ Category Breakdown">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                paddingAngle={4}
                label={(entry) => entry.name}
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "16px",
                  backdropFilter: "blur(12px)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Most productive day */}
        <ChartCard title="📅 Most Productive Day">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dayData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} fontWeight={600} />
              <YAxis
                type="category"
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={11}
                fontWeight={600}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "16px",
                  backdropFilter: "blur(12px)",
                }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[0, 8, 8, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Overdue trend */}
      <ChartCard title="⚠️ Overdue Trend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.overdueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => w.slice(5)}
              stroke="var(--muted-foreground)"
              fontSize={11}
              fontWeight={600}
            />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} fontWeight={600} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "16px",
                backdropFilter: "blur(12px)",
              }}
            />
            <Bar dataKey="overdue" fill="#f87171" radius={[8, 8, 0, 0]} name="Overdue" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Quiz score progression */}
      {data.quizProgression.length > 0 && (
        <ChartCard title="🧠 Quiz Score Progression">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.quizProgression}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="week"
                tickFormatter={(w) => w.slice(5)}
                stroke="var(--muted-foreground)"
                fontSize={11}
                fontWeight={600}
              />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} fontWeight={600} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "16px",
                  backdropFilter: "blur(12px)",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2dd4bf"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                name="Score %"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Streak heatmap (GitHub/LeetCode style) */}
      <ChartCard title="🔥 Activity Heatmap">
        <div className="overflow-x-auto scrollbar-thin py-2">
          <GithubHeatmap values={data.heatmap} numWeeks={53} />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Less</span>
          <span className="gh-legend gh-cell-empty border border-border/30" />
          <span className="gh-legend gh-cell-1" />
          <span className="gh-legend gh-cell-2" />
          <span className="gh-legend gh-cell-3" />
          <span className="gh-legend gh-cell-4" />
          <span>More</span>
        </div>
      </ChartCard>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-border/70">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-xl pointer-events-none" />
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-6 shadow-sm border border-border/70 relative">
      <h2 className="mb-5 text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

