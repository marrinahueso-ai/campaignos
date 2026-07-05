"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  ListChecks,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateEventPlaybookTaskStatusAction } from "@/lib/event-playbooks/actions";
import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubCommitteeGroup, TaskHubPageData } from "@/types/task-hub";

const STATUS_CYCLE: EventPlaybookTaskStatus[] = ["todo", "in_progress", "done"];

function nextStatus(current: EventPlaybookTaskStatus): EventPlaybookTaskStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length] ?? "todo";
}

function statusBadge(status: EventPlaybookTaskStatus) {
  switch (status) {
    case "in_progress":
      return <Badge variant="info">In progress</Badge>;
    case "done":
      return <Badge variant="success">Done</Badge>;
    default:
      return null;
  }
}

interface TaskHubListProps {
  data: TaskHubPageData;
}

export function TaskHubList({ data }: TaskHubListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [collapsedCommittees, setCollapsedCommittees] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [taskStatuses, setTaskStatuses] = useState<
    Record<string, EventPlaybookTaskStatus>
  >({});

  function committeeKey(group: TaskHubCommitteeGroup): string {
    return group.committeeId ?? group.committeeName;
  }

  function isCommitteeCollapsed(group: TaskHubCommitteeGroup): boolean {
    return collapsedCommittees.has(committeeKey(group));
  }

  function toggleCommitteeCollapsed(group: TaskHubCommitteeGroup) {
    const key = committeeKey(group);
    setCollapsedCommittees((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function resolveTaskStatus(
    taskId: string,
    fallback: EventPlaybookTaskStatus,
  ): EventPlaybookTaskStatus {
    return taskStatuses[taskId] ?? fallback;
  }

  function handleToggleStatus(
    eventId: string,
    taskId: string,
    title: string,
    currentStatus: EventPlaybookTaskStatus,
  ) {
    if (pendingTaskIds.has(taskId)) {
      return;
    }

    const status = nextStatus(currentStatus);
    setTaskStatuses((current) => ({ ...current, [taskId]: status }));
    setPendingTaskIds((current) => new Set(current).add(taskId));

    startTransition(async () => {
      const result = await updateEventPlaybookTaskStatusAction(
        eventId,
        taskId,
        status,
        title,
      );

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });

      if (!result.success) {
        setTaskStatuses((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });
        return;
      }

      router.refresh();
    });
  }

  if (!data.tablesAvailable) {
    return (
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Task hub unavailable</CardTitle>
          <CardDescription>
            Run migration 031_event_playbook_tables.sql to enable cross-event task tracking.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (data.committees.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks yet"
        description={
          data.scope === "chaired_committees"
            ? "Tasks from your committee events will appear here once playbook checklists are created."
            : "Playbook tasks from active campaigns will appear here, grouped by committee."
        }
        className="cos-card py-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.committees.map((group) => {
        const collapsed = isCommitteeCollapsed(group);
        const openCount = group.totalCount - group.doneCount;

        return (
          <Card key={committeeKey(group)} padding="none" className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-cos-border bg-cos-bg px-4 py-3">
              <button
                type="button"
                onClick={() => toggleCommitteeCollapsed(group)}
                className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
                )}
                <span className="truncate font-display text-base text-cos-text">
                  {group.committeeName}
                </span>
                <span className="text-xs text-cos-muted tabular-nums">
                  {group.doneCount}/{group.totalCount} done
                </span>
                {openCount > 0 && (
                  <Badge variant="warning">{openCount} open</Badge>
                )}
              </button>
            </div>

            {!collapsed && (
              <ul className="divide-y divide-cos-border">
                {group.tasks.map((task) => {
                  const status = resolveTaskStatus(task.id, task.status);
                  const isPending = pendingTaskIds.has(task.id);

                  return (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-cos-bg/60"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleStatus(
                            task.eventId,
                            task.id,
                            task.title,
                            status,
                          )
                        }
                        disabled={isPending || pending}
                        className="mt-0.5 shrink-0 text-cos-muted hover:text-cos-text disabled:opacity-50"
                        aria-label={`Toggle ${task.title}`}
                      >
                        {status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-cos-success-text" />
                        ) : status === "in_progress" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-cos-info-text" />
                        ) : (
                          <Circle className="h-5 w-5" strokeWidth={1.5} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm text-cos-text",
                            status === "done" && "text-cos-muted line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cos-muted">
                          <Link
                            href={task.event.eventHref}
                            className="inline-flex items-center gap-1 hover:text-cos-text"
                          >
                            {task.event.eventTitle}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <span>{formatEventDate(task.event.eventDate)}</span>
                          {task.dueDate && (
                            <span>Due {formatEventDate(task.dueDate)}</span>
                          )}
                          {task.assigneeName && <span>{task.assigneeName}</span>}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {statusBadge(status)}
                        {task.assigneeInitials && (
                          <span className="flex h-7 w-7 items-center justify-center bg-cos-dark text-[10px] font-medium text-[#f6f2eb]">
                            {task.assigneeInitials}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
