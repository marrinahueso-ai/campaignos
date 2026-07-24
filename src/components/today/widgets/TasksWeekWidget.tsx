import Link from "next/link";
import { Check, CheckSquare } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import type { TaskHubTaskItem } from "@/types/task-hub";

interface TasksWeekWidgetProps {
  items: TaskHubTaskItem[];
}

export function TasksWeekWidget({ items }: TasksWeekWidgetProps) {
  const visible = items.slice(0, 3);

  return (
    <DashboardWidgetCard icon={CheckSquare} title="Tasks this week">
      {visible.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          No tasks due this week.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="space-y-3">
            {visible.map((task) => {
              const due = task.dueDate ?? task.monday?.mondayDueDate ?? null;
              return (
                <li key={task.id}>
                  <Link
                    href={task.event.eventHref}
                    className="flex items-start gap-3 rounded-xl transition-colors hover:bg-cos-card/70"
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cos-card text-cos-muted ring-1 ring-black/[0.04]">
                      <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-cos-text">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-cos-muted">
                        {task.event.eventTitle}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-cos-muted">
                      {due ? formatShortDate(due) : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/tasks?tab=my_tasks&view=this_week"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            View all ({items.length}) →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function formatShortDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
