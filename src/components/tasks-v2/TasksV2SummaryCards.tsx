import type { TasksV2SummaryStats } from "@/types/tasks-v2";

interface TasksV2SummaryCardsProps {
  summary: TasksV2SummaryStats;
}

const CARDS = [
  {
    key: "tasksDue" as const,
    label: "Tasks due",
    description: "In the next 7 days",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    description: "Needs attention",
  },
  {
    key: "completedThisMonth" as const,
    label: "Completed",
    description: "This month",
  },
];

export function TasksV2SummaryCards({ summary }: TasksV2SummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-cos-bg-alt px-4 py-5 text-center shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]"
        >
          <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
            {card.label}
          </p>
          <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
            {summary[card.key]}
          </p>
          <p className="text-xs text-cos-muted">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
