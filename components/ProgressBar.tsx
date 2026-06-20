interface ProgressBarProps {
  value: number; // completed
  total: number; // total tasks
  className?: string;
}

export function ProgressBar({ value, total, className = "" }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {value}/{total} tasks completed
        </span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 dark:from-indigo-400 dark:to-indigo-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
