"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Circle } from "lucide-react";
import {
  formatTaskDueLabel,
  groupOpenTasksByDue,
  type TaskDueGroup,
} from "@/lib/event-playbooks/planning-hub-utils";
import { updateEventPlaybookTaskStatusAction } from "@/lib/event-playbooks/actions";
import { nextTaskStatus } from "@/lib/event-playbooks/task-status";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { EventPlaybookTask } from "@/types/event-playbooks";
import { cn } from "@/lib/utils/cn";

const GROUP_META: Record<
  TaskDueGroup,
  { label: string; countClass: string; dueClass: string }
> = {
  overdue: {
    label: "Overdue",
    countClass: "text-[#b86b55]",
    dueClass: "text-[#b86b55]",
  },
  today: {
    label: "Today",
    countClass: "text-[#5b8fc7]",
    dueClass: "text-[#b86b55]",
  },
  upcoming: {
    label: "Upcoming",
    countClass: "text-[#5a9e6f]",
    dueClass: "text-[#5a9e6f]",
  },
};

interface PlanningHubMyTasksProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  tablesAvailable: boolean;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

export function PlanningHubMyTasks({
  eventId,
  tasks,
  tablesAvailable,
  onNavigateTab,
}: PlanningHubMyTasksProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const grouped = groupOpenTasksByDue(tasks);

  function toggleTask(task: EventPlaybookTask) {
    if (!tablesAvailable || pending) {
      return;
    }

    startTransition(async () => {
      await updateEventPlaybookTaskStatusAction(
        eventId,
        task.id,
        nextTaskStatus(task.status),
        task.title,
      );
      router.refresh();
    });
  }

  const sections: TaskDueGroup[] = ["overdue", "today", "upcoming"];

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle
        icon={CheckSquare}
        title="My Tasks"
        action={
          <PlanningHubActionLink onClick={() => onNavigateTab("tasks")}>
            View all tasks →
          </PlanningHubActionLink>
        }
      />

      <div className="mt-4 flex-1 space-y-4">
        {sections.map((group) => {
          const items = grouped[group];
          const meta = GROUP_META[group];

          return (
            <div key={group}>
              <p className={cn("text-[10px] font-bold tracking-[0.12em] uppercase", meta.countClass)}>
                {meta.label} ({items.length})
              </p>
              {items.length === 0 ? (
                <p className="mt-1 text-xs text-[#a89f94]">None</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {items.slice(0, group === "upcoming" ? 3 : 2).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        disabled={!tablesAvailable || pending}
                        onClick={() => toggleTask(task)}
                        className="flex w-full items-start gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-[#faf7f2] disabled:opacity-50"
                      >
                        {task.status === "done" ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#5a9e6f]" strokeWidth={1.5} />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#c4bab0]" strokeWidth={1.5} />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#2a2622]">
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span className={cn("text-xs font-medium", meta.dueClass)}>
                              {formatTaskDueLabel(task.dueDate, group)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </PlanningHubCard>
  );
}
