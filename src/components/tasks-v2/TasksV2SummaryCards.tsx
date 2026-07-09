import { Bell, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TasksV2SummaryStats } from "@/types/tasks-v2";

interface TasksV2SummaryCardsProps {
  summary: TasksV2SummaryStats;
}

const CARDS = [
  {
    key: "tasksDue" as const,
    label: "Tasks due",
    description: "In the next 7 days",
    icon: Calendar,
    iconClassName: "text-[#c87d3a]",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    description: "Needs attention",
    icon: Bell,
    iconClassName: "text-[#b14f4f]",
  },
  {
    key: "completedThisMonth" as const,
    label: "Completed",
    description: "This month",
    icon: CheckCircle2,
    iconClassName: "text-[#3f5240]",
  },
];

export function TasksV2SummaryCards({ summary }: TasksV2SummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];

        return (
          <div
            key={card.key}
            className="border border-cos-border bg-cos-card px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", card.iconClassName)}
                strokeWidth={1.5}
              />
              <div className="min-w-0">
                <p className="text-xs text-cos-muted">{card.label}</p>
                <p className="font-display mt-0.5 text-2xl text-cos-text">{value}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-cos-muted">
                  {card.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
