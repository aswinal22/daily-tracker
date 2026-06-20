"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
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

const PIE_COLORS = ["#6366f1", "#0ea5e9", "#14b8a6"];

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
        <h1 className="text-2xl font-bold">📊 Insights</h1>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="animate-pulse text-muted-foreground">Loading insights...</p>
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
    <div className="space-y-6">
      {/* Header + range filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📊 Insights</h1>
        <div className="flex gap-2">
          {(["week", "month", "3months", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                range === r
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted",
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => w.slice(5)}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Completed"
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Total"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
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
                label={(entry) => entry.name}
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Most productive day */}
        <ChartCard title="📅 Most Productive Day">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dayData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={11}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Overdue trend */}
      <ChartCard title="⚠️ Overdue Trend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.overdueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => w.slice(5)}
              stroke="var(--muted-foreground)"
              fontSize={11}
            />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            />
            <Bar dataKey="overdue" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Quiz score progression */}
      {data.quizProgression.length > 0 && (
        <ChartCard title="🧠 Quiz Score Progression">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.quizProgression}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="week"
                tickFormatter={(w) => w.slice(5)}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Score %"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Streak heatmap */}
      <ChartCard title="🔥 Activity Heatmap">
        <div className="scrollbar-thin overflow-x-auto pb-2">
          <CalendarHeatmap
            startDate={
              data.heatmap[0]?.date ||
              new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
            }
            endDate={new Date().toISOString()}
            values={data.heatmap.map((d) => ({ date: d.date, count: d.count }))}
            gutterSize={3}
            classForValue={(value) => {
              if (!value || value.count === 0) return "color-empty";
              if (value.count === 1) return "color-scale-1";
              if (value.count === 2) return "color-scale-2";
              if (value.count <= 4) return "color-scale-3";
              return "color-scale-4";
            }}
            titleForValue={(value) => {
              if (!value) return "No data";
              return `${value.date}: ${value.count} task${value.count === 1 ? "" : "s"} completed`;
            }}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#e5e7eb" }} />
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#c7d2fe" }} />
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#818cf8" }} />
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#4f46e5" }} />
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#3730a3" }} />
          <span>More</span>
        </div>
      </ChartCard>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}
