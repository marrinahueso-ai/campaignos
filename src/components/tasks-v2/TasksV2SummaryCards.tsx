"use client";

import { cn } from "@/lib/utils/cn";
import type {
  TasksV2SummaryFilter,
  TasksV2SummaryStats,
} from "@/types/tasks-v2";

interface TasksV2SummaryCardsProps {
  summary: TasksV2SummaryStats;
  activeFilter: TasksV2SummaryFilter | null;
  onFilterChange: (filter: TasksV2SummaryFilter) => void;
}

const CARDS: {
  key: keyof TasksV2SummaryStats;
  filter: TasksV2SummaryFilter;
  label: string;
  description: string;
}[] = [
  {
    key: "tasksDue",
    filter: "tasks_due",
    label: "Tasks due",
    description: "In the next 7 days",
  },
  {
    key: "overdue",
    filter: "overdue",
    label: "Overdue",
    description: "Needs attention",
  },
  {
    key: "completedThisMonth",
    filter: "completed",
    label: "Completed",
    description: "This month",
  },
];

export function TasksV2SummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: TasksV2SummaryCardsProps) {
  function handleCardClick(filter: TasksV2SummaryFilter) {
    onFilterChange(filter);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CARDS.map((card) => {
        const isActive = activeFilter === card.filter;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCardClick(card.filter)}
            aria-pressed={isActive}
            className={cn(
              "flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-center transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cos-bg",
              isActive
                ? "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark"
                : "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04] hover:ring-cos-accent/40",
            )}
          >
            <span
              className={cn(
                "text-xs font-medium tracking-wide uppercase",
                isActive ? "text-white/70" : "text-cos-muted",
              )}
            >
              {card.label}
            </span>
            <span
              className={cn(
                "font-display text-3xl leading-none tabular-nums",
                isActive ? "text-white" : "text-cos-text",
              )}
            >
              {summary[card.key]}
            </span>
            <span
              className={cn(
                "text-xs",
                isActive ? "text-white/70" : "text-cos-muted",
              )}
            >
              {card.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
