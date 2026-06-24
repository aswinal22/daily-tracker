"use client";

import { useMemo } from "react";

interface HeatmapValue {
  date: string; // yyyy-mm-dd
  count: number;
}

interface GithubHeatmapProps {
  values: HeatmapValue[];
  /** Number of weeks to show (default: 26 = ~6 months) */
  numWeeks?: number;
}

const CELL_SIZE = 11;
const GAP = 2;
const CELL_PITCH = CELL_SIZE + GAP;
const ROW_LABEL_WIDTH = 28;
const TOP_PADDING = 18; // room for month labels

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]; // index 0=Sun
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function levelClass(count: number): string {
  if (count === 0) return "gh-cell-empty";
  if (count === 1) return "gh-cell-1";
  if (count === 2) return "gh-cell-2";
  if (count <= 4) return "gh-cell-3";
  return "gh-cell-4";
}

/**
 * GitHub/LeetCode-style contribution heatmap.
 * Weeks are columns, days are rows. Compact and clean.
 */
export function GithubHeatmap({ values, numWeeks = 26 }: GithubHeatmapProps) {
  const { weeks, monthLabels, width, height } = useMemo(() => {
    const valueMap = new Map<string, number>();
    for (const v of values) {
      valueMap.set(v.date, v.count);
    }

    // Build the grid: end today, go back numWeeks weeks.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the Saturday of the current week (end column)
    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0=Sun
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));

    // Start = numWeeks weeks before, aligned to Sunday
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - (numWeeks * 7 - 1));
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const cols: { date: Date; count: number }[][] = [];
    const cursor = new Date(startDate);
    const months: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;

    while (cursor <= endOfWeek) {
      const week: { date: Date; count: number }[] = [];
      const colIndex = cols.length;

      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const count = valueMap.get(dateStr) || 0;
        week.push({ date: new Date(cursor), count });

        // Track month label placement (first week of a new month)
        const m = cursor.getMonth();
        if (d === 0 && m !== lastMonth && cursor <= today) {
          months.push({ label: MONTH_LABELS[m], colIndex });
          lastMonth = m;
        }

        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(week);
    }

    const w = ROW_LABEL_WIDTH + cols.length * CELL_PITCH + 4;
    const h = TOP_PADDING + 7 * CELL_PITCH + 2;

    return { weeks: cols, monthLabels: months, width: w, height: h };
  }, [values, numWeeks]);

  return (
    <div className="gh-heatmap-wrapper scrollbar-thin overflow-x-auto overflow-y-hidden pb-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Activity heatmap"
        className="gh-heatmap"
        style={{ width: "100%", minWidth: "680px" }}
      >
        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text
            key={`${m.label}-${i}`}
            x={ROW_LABEL_WIDTH + m.colIndex * CELL_PITCH}
            y={12}
            className="gh-month-label"
          >
            {m.label}
          </text>
        ))}

        {/* Day labels (Mon, Wed, Fri) */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={label}
              x={0}
              y={TOP_PADDING + i * CELL_PITCH + CELL_SIZE - 1}
              className="gh-day-label"
            >
              {label}
            </text>
          ) : null,
        )}

        {/* Cells */}
        {weeks.map((week, colIdx) =>
          week.map((cell, rowIdx) => {
            const x = ROW_LABEL_WIDTH + colIdx * CELL_PITCH;
            const y = TOP_PADDING + rowIdx * CELL_PITCH;
            const dateStr = cell.date.toISOString().slice(0, 10);
            const title = `${dateStr}: ${cell.count} task${cell.count === 1 ? "" : "s"}`;
            return (
              <rect
                key={`${colIdx}-${rowIdx}`}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                ry={2}
                className={levelClass(cell.count)}
              >
                <title>{title}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}
