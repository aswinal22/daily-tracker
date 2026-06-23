"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // yyyy-mm-dd
  onChange: (date: string) => void;
  min?: string; // yyyy-mm-dd
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const minDate = min ? new Date(min + "T00:00:00") : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
          !value && "text-muted-foreground",
        )}
      >
        <span>{value ? format(selected!, "MMM d, yyyy") : placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn("text-muted-foreground transition", open && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-border bg-card p-3 shadow-xl animate-scale-in">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={minDate ? { before: minDate } : undefined}
            classNames={{
              root: "rdp-root",
              months: "flex flex-col",
              month: "space-y-3",
              month_caption: "flex justify-center pt-1 relative items-center mb-2",
              caption_label: "text-sm font-medium",
              nav: "flex items-center gap-1",
              button_previous: cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-lg absolute left-1",
                "border border-border transition hover:bg-muted",
              ),
              button_next: cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-lg absolute right-1",
                "border border-border transition hover:bg-muted",
              ),
              month_grid: "w-full border-collapse",
              weekdays: "flex gap-0.5",
              weekday: "text-muted-foreground rounded-md w-8 font-medium text-[0.8rem] text-center py-1",
              week: "flex gap-0.5 mt-0.5",
              day: cn(
                "h-8 w-8 p-0 font-normal rounded-md text-center text-sm cursor-pointer",
                "hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              ),
              selected: "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
              today: "ring-1 ring-accent text-accent",
              outside: "text-muted-foreground opacity-50",
              disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
              hidden: "invisible",
            }}
            components={{
              Chevron: ({ orientation }) => (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {orientation === "left" ? (
                    <path d="M15 18l-6-6 6-6" />
                  ) : (
                    <path d="M9 18l6-6-6-6" />
                  )}
                </svg>
              ),
            }}
          />
        </div>
      )}
    </div>
  );
}
