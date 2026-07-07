"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CheckSquare, Circle, GripVertical } from "lucide-react";
import {
  formatTaskDueLabel,
  groupOpenTasksByDue,
  type TaskDueGroup,
} from "@/lib/event-playbooks/planning-hub-utils";
import {
  reorderEventPlaybookTasksAction,
  updateEventPlaybookTaskStatusAction,
} from "@/lib/event-playbooks/actions";
import {
  buildTaskChecklistSections,
  sectionsToPersistedOrder,
} from "@/lib/event-playbooks/grouping";
import {
  readPlanningHubTaskDragPayload,
  setPlanningHubTaskDragData,
} from "@/components/event-playbooks/planning-hub/planning-hub-task-dnd";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type {
  EventPlaybookTask,
  EventPlaybookTaskGroup,
} from "@/types/event-playbooks";
import { cn } from "@/lib/utils/cn";

const GROUP_META: Record<
  TaskDueGroup,
  { label: string; countClass: string; dueClass: string; limit: number }
> = {
  overdue: {
    label: "Overdue",
    countClass: "text-cos-error",
    dueClass: "text-cos-error",
    limit: 2,
  },
  today: {
    label: "Today",
    countClass: "text-cos-accent",
    dueClass: "text-cos-accent",
    limit: 2,
  },
  upcoming: {
    label: "Upcoming",
    countClass: "text-cos-success",
    dueClass: "text-cos-success",
    limit: 3,
  },
};

interface PlanningHubMyTasksProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  taskGroups: EventPlaybookTaskGroup[];
  tablesAvailable: boolean;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

function sortTasksByOrder(
  taskList: EventPlaybookTask[],
  orderedIds: string[],
): EventPlaybookTask[] {
  const indexMap = new Map(orderedIds.map((id, index) => [id, index]));
  return [...taskList].sort(
    (left, right) =>
      (indexMap.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (indexMap.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function buildPersistOrder(
  allTasks: EventPlaybookTask[],
  taskGroups: EventPlaybookTaskGroup[],
  newOpenOrder: string[],
) {
  const doneTasks = allTasks
    .filter((task) => task.status === "done")
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const openById = new Map(
    allTasks
      .filter((task) => task.status !== "done")
      .map((task) => [task.id, task]),
  );
  const reorderedOpen = newOpenOrder
    .map((id) => openById.get(id))
    .filter((task): task is EventPlaybookTask => Boolean(task));
  const merged = [...doneTasks, ...reorderedOpen];
  const sections = buildTaskChecklistSections(taskGroups, merged);
  return sectionsToPersistedOrder(sections);
}

export function PlanningHubMyTasks({
  eventId,
  tasks,
  taskGroups,
  tablesAvailable,
  onNavigateTab,
}: PlanningHubMyTasksProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [orderedOpenIds, setOrderedOpenIds] = useState<string[]>([]);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<TaskDueGroup | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );

  const enableDrag = tablesAvailable;

  useEffect(() => {
    const openTasks = tasks
      .filter((task) => task.status !== "done")
      .sort((left, right) => left.sortOrder - right.sortOrder);
    setOrderedOpenIds(openTasks.map((task) => task.id));
  }, [tasks]);

  const grouped = useMemo(() => {
    const base = groupOpenTasksByDue(tasks);
    return {
      overdue: sortTasksByOrder(base.overdue, orderedOpenIds),
      today: sortTasksByOrder(base.today, orderedOpenIds),
      upcoming: sortTasksByOrder(base.upcoming, orderedOpenIds),
    };
  }, [orderedOpenIds, tasks]);

  function persistOpenOrder(nextOpenOrder: string[], previousOpenOrder: string[]) {
    setOrderedOpenIds(nextOpenOrder);
    startTransition(async () => {
      const result = await reorderEventPlaybookTasksAction(
        eventId,
        buildPersistOrder(tasks, taskGroups, nextOpenOrder),
      );
      if (!result.success) {
        setOrderedOpenIds(previousOpenOrder);
        return;
      }
      router.refresh();
    });
  }

  function moveTask(taskId: string, targetIndex: number) {
    const previous = orderedOpenIds;
    const fromIndex = previous.indexOf(taskId);
    if (fromIndex < 0) {
      return;
    }

    const next = [...previous];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(targetIndex, next.length));
    next.splice(clampedIndex, 0, moved);
    persistOpenOrder(next, previous);
  }

  function handleTaskDrop(taskId: string, targetGroup: TaskDueGroup, targetIndex: number) {
    const groupTasks = grouped[targetGroup];
    const visibleTasks = groupTasks.slice(0, GROUP_META[targetGroup].limit);
    const globalIndex = orderedOpenIds.indexOf(visibleTasks[targetIndex]?.id ?? "");
    const fallbackIndex = orderedOpenIds.length;
    moveTask(taskId, globalIndex >= 0 ? globalIndex : fallbackIndex);
  }

  function completeTask(task: EventPlaybookTask) {
    if (!tablesAvailable || pending || pendingTaskIds.has(task.id)) {
      return;
    }

    setPendingTaskIds((current) => new Set(current).add(task.id));
    startTransition(async () => {
      await updateEventPlaybookTaskStatusAction(
        eventId,
        task.id,
        "done",
        task.title,
      );
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
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
          const visibleItems = items.slice(0, meta.limit);

          return (
            <div
              key={group}
              onDragOver={
                enableDrag
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverGroup(group);
                    }
                  : undefined
              }
              onDragLeave={
                enableDrag
                  ? () => {
                      if (dragOverGroup === group) {
                        setDragOverGroup(null);
                      }
                    }
                  : undefined
              }
              onDrop={
                enableDrag
                  ? (event) => {
                      event.preventDefault();
                      setDragOverGroup(null);
                      const payload = readPlanningHubTaskDragPayload(event);
                      if (!payload) {
                        return;
                      }
                      handleTaskDrop(payload.taskId, group, visibleItems.length);
                    }
                  : undefined
              }
              className={cn(
                enableDrag && dragOverGroup === group && "rounded-lg ring-1 ring-cos-dark",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-bold tracking-[0.12em] uppercase",
                  meta.countClass,
                )}
              >
                {meta.label} ({items.length})
              </p>
              {items.length === 0 ? (
                <p className="mt-1 text-center text-xs text-cos-dark-muted">None</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {visibleItems.map((task, taskIndex) => {
                    const isPending = pendingTaskIds.has(task.id);

                    return (
                      <li
                        key={task.id}
                        draggable={enableDrag}
                        onDragStart={
                          enableDrag
                            ? (event) => {
                                setPlanningHubTaskDragData(event, { taskId: task.id });
                              }
                            : undefined
                        }
                        onDragOver={
                          enableDrag
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                event.dataTransfer.dropEffect = "move";
                                setDragOverTaskId(task.id);
                              }
                            : undefined
                        }
                        onDragLeave={
                          enableDrag
                            ? () => {
                                if (dragOverTaskId === task.id) {
                                  setDragOverTaskId(null);
                                }
                              }
                            : undefined
                        }
                        onDrop={
                          enableDrag
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setDragOverTaskId(null);
                                const payload = readPlanningHubTaskDragPayload(event);
                                if (payload) {
                                  handleTaskDrop(payload.taskId, group, taskIndex);
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          "flex items-start gap-2 rounded-lg px-1 py-1 transition-colors",
                          enableDrag && dragOverTaskId === task.id && "bg-cos-bg ring-1 ring-cos-dark",
                        )}
                      >
                        {enableDrag && (
                          <GripVertical
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-cos-muted active:cursor-grabbing"
                            aria-hidden
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => completeTask(task)}
                          disabled={!tablesAvailable || isPending || pending}
                          className="shrink-0 text-cos-muted hover:text-cos-text disabled:opacity-50"
                          aria-label={`Mark ${task.title} complete`}
                        >
                          {isPending ? (
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-cos-success"
                              strokeWidth={1.5}
                            />
                          ) : (
                            <Circle
                              className="mt-0.5 h-4 w-4 shrink-0 text-cos-dark-muted"
                              strokeWidth={1.5}
                            />
                          )}
                        </button>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-cos-text">
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span className={cn("text-xs font-medium", meta.dueClass)}>
                              {formatTaskDueLabel(task.dueDate, group)}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </PlanningHubCard>
  );
}
