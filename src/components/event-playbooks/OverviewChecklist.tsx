"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PlanningProgressRing } from "@/components/event-playbooks/PlanningProgressRing";
import { updateEventPlaybookTaskStatusAction } from "@/lib/event-playbooks/actions";
import { computePlanningProgress } from "@/lib/event-playbooks/progress";
import type { EventPlaybookTask, EventPlaybookTaskStatus } from "@/types/event-playbooks";
import { cn } from "@/lib/utils/cn";

const PREVIEW_LIMIT = 4;

interface OverviewChecklistProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  planningProgressPercent: number;
  tablesAvailable: boolean;
}

export function OverviewChecklist({
  eventId,
  tasks: tasksFromServer,
  tablesAvailable,
}: OverviewChecklistProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasksFromServer);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalTasks(tasksFromServer);
  }, [tasksFromServer]);

  const planningProgressPercent = computePlanningProgress(localTasks);
  const openTasks = localTasks.filter((task) => task.status !== "done");
  const visibleTasks = expanded ? localTasks : localTasks.slice(0, PREVIEW_LIMIT);
  const hiddenCount = Math.max(0, localTasks.length - PREVIEW_LIMIT);

  function toggleTask(task: EventPlaybookTask) {
    if (!tablesAvailable || pendingTaskIds.has(task.id)) {
      return;
    }

    const nextStatus: EventPlaybookTaskStatus =
      task.status === "done" ? "todo" : "done";
    const previousTasks = localTasks;

    setLocalTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, status: nextStatus } : item,
      ),
    );
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateEventPlaybookTaskStatusAction(
        eventId,
        task.id,
        nextStatus,
        task.title,
      );

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });

      if (!result.success) {
        setLocalTasks(previousTasks);
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="studio-eyebrow">Planning progress</p>
          <h3 className="font-display mt-2 text-2xl text-cos-text">
            {openTasks.length === 0 && localTasks.length > 0
              ? "All tasks complete"
              : `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} remaining`}
          </h3>
          <p className="mt-2 text-sm text-cos-muted">
            {localTasks.length} checklist item{localTasks.length === 1 ? "" : "s"} tracked for
            this event. Check off items here — no need to switch tabs.
          </p>
        </div>
        <PlanningProgressRing percent={planningProgressPercent} />
      </div>

      {localTasks.length > 0 && (
        <>
          <ul className="mt-8 space-y-2 border-t border-cos-border pt-6">
            {visibleTasks.map((task) => {
              const isPending = pendingTaskIds.has(task.id);

              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggleTask(task)}
                    disabled={!tablesAvailable || isPending}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm transition-colors hover:border-cos-border hover:bg-cos-bg-alt disabled:cursor-wait"
                  >
                    {task.status === "done" ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-cos-success-text"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-cos-border" strokeWidth={1.5} />
                    )}
                    <span
                      className={cn(
                        "flex-1 text-cos-text",
                        task.status === "done" && "text-cos-muted line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    {task.status === "in_progress" && (
                      <Badge variant="info">In progress</Badge>
                    )}
                    {isPending && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cos-muted" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cos-text hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show fewer
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4" />
                  Show all {localTasks.length} tasks
                </>
              )}
            </button>
          )}
        </>
      )}
    </>
  );
}
