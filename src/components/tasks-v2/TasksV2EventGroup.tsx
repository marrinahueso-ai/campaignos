"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TasksV2AddTaskRow } from "@/components/tasks-v2/TasksV2AddTaskRow";
import { TasksV2TaskDetailDrawer } from "@/components/tasks-v2/TasksV2TaskDetailDrawer";
import { TasksV2TaskRow } from "@/components/tasks-v2/TasksV2TaskRow";
import { readTasksV2DragPayload } from "@/components/tasks-v2/tasks-v2-dnd";
import {
  createTaskHubTaskAction,
  reorderTaskHubTasksAction,
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { filterAndSortTasks } from "@/lib/task-hub/list-filters";
import { reorderEventTasks } from "@/lib/tasks-v2/reorder";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TasksV2EventGroup } from "@/types/tasks-v2";
import type { TaskHubOrgMember, TaskHubTaskItem } from "@/types/task-hub";

interface TasksV2EventGroupSectionProps {
  group: TasksV2EventGroup;
  canEdit: boolean;
  orgMembers: TaskHubOrgMember[];
  searchQuery: string;
  statusFilter: import("@/lib/task-hub/list-filters").TaskHubStatusFilter;
  sortMode: import("@/lib/task-hub/list-filters").TaskHubSortMode;
  /** Filter by auth user id (preferred) or legacy display name. */
  personFilter: string;
  requestExpandAdd?: boolean;
  onExpandAddHandled?: () => void;
}

export function TasksV2EventGroupSection({
  group: initialGroup,
  canEdit,
  orgMembers,
  searchQuery,
  statusFilter,
  sortMode,
  personFilter,
  requestExpandAdd = false,
  onExpandAddHandled,
}: TasksV2EventGroupSectionProps) {
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState(initialGroup.tasks);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set());
  const [taskStatuses, setTaskStatuses] = useState<
    Record<string, EventPlaybookTaskStatus>
  >({});
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasksSyncKey = initialGroup.tasks
    .map(
      (task) =>
        `${task.id}:${task.status}:${task.sortOrder}:${task.title}:${task.assigneeUserId ?? ""}:${task.assigneeName ?? ""}:${task.dueDate ?? ""}:${task.notes ?? ""}`,
    )
    .join("|");

  useEffect(() => {
    setTasks(initialGroup.tasks);
    setTaskStatuses({});
    setPendingTaskIds(new Set());
  }, [tasksSyncKey, initialGroup.tasks]);

  useEffect(() => {
    if (!requestExpandAdd) return;
    setCollapsed(false);
  }, [requestExpandAdd]);

  const filteredTasks = useMemo(() => {
    let result = filterAndSortTasks(tasks, {
      searchQuery,
      statusFilter,
      sortMode,
      statusOverrides: taskStatuses,
    });

    if (personFilter.trim()) {
      const query = personFilter.trim();
      result = result.filter((task) => {
        if (task.assigneeUserId && task.assigneeUserId === query) {
          return true;
        }
        return (task.assigneeName ?? "")
          .toLowerCase()
          .includes(query.toLowerCase());
      });
    }

    return result;
  }, [tasks, searchQuery, statusFilter, sortMode, taskStatuses, personFilter]);

  function resolveStatus(
    taskId: string,
    fallback: EventPlaybookTaskStatus,
  ): EventPlaybookTaskStatus {
    return taskStatuses[taskId] ?? fallback;
  }

  function handleStatusChange(task: TaskHubTaskItem, status: EventPlaybookTaskStatus) {
    setTaskStatuses((current) => ({ ...current, [task.id]: status }));
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateTaskHubTaskStatusAction(
        task.event.eventId,
        task.id,
        status,
        task.title,
      );
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
      if (!result.success) {
        setTaskStatuses((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
      } else {
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id ? { ...item, status } : item,
          ),
        );
      }
    });
  }

  function handleAddTask(title: string) {
    startTransition(async () => {
      const result = await createTaskHubTaskAction(initialGroup.eventId, {
        title,
      });
      if (!result.success || !result.taskId) {
        return;
      }
      const now = new Date().toISOString();
      setTasks((current) => [
        ...current,
        {
          id: result.taskId!,
          eventId: initialGroup.eventId,
          title,
          status: "todo",
          dueDate: null,
          assigneeName: null,
          assigneeInitials: null,
          assigneeUserId: null,
          groupId: null,
          notes: null,
          sortOrder: current.length,
          createdAt: now,
          updatedAt: now,
          event: {
            eventId: initialGroup.eventId,
            eventTitle: initialGroup.eventTitle,
            eventDate: initialGroup.eventDate,
            eventHref: initialGroup.eventHref,
          },
        },
      ]);
    });
  }

  function handleAssigneeChange(
    task: TaskHubTaskItem,
    next: {
      assigneeUserId: string | null;
      assigneeName: string | null;
      assigneeInitials: string | null;
    },
  ) {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              assigneeUserId: next.assigneeUserId,
              assigneeName: next.assigneeName,
              assigneeInitials: next.assigneeInitials,
            }
          : item,
      ),
    );
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        task.event.eventId,
        task.id,
        {
          assigneeUserId: next.assigneeUserId,
          assigneeName: next.assigneeName,
          assigneeInitials: next.assigneeInitials,
        },
        task.title,
      );
      setPendingTaskIds((current) => {
        const pendingNext = new Set(current);
        pendingNext.delete(task.id);
        return pendingNext;
      });
      if (!result.success) {
        setTasks(initialGroup.tasks);
      }
    });
  }

  function handleDueDateChange(task: TaskHubTaskItem, dueDate: string | null) {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, dueDate } : item,
      ),
    );
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        task.event.eventId,
        task.id,
        { dueDate },
        task.title,
      );
      setPendingTaskIds((current) => {
        const pendingNext = new Set(current);
        pendingNext.delete(task.id);
        return pendingNext;
      });
      if (!result.success) {
        setTasks(initialGroup.tasks);
      }
    });
  }

  const selectedTask =
    selectedTaskId == null
      ? null
      : (tasks.find((task) => task.id === selectedTaskId) ?? null);

  function handleNotesSaved(taskId: string, notes: string | null) {
    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, notes } : item)),
    );
  }

  function handleDrop(targetTaskId: string, event: React.DragEvent) {
    event.preventDefault();
    setDragOverTaskId(null);
    const payload = readTasksV2DragPayload(event);
    if (!payload || payload.eventId !== initialGroup.eventId) {
      return;
    }

    const reordered = reorderEventTasks(tasks, payload.taskId, targetTaskId);
    if (!reordered) {
      return;
    }

    setTasks(reordered);
    startTransition(async () => {
      const result = await reorderTaskHubTasksAction(
        reordered.map((task) => ({
          id: task.id,
          eventId: task.event.eventId,
        })),
      );
      if (!result.success) {
        setTasks(initialGroup.tasks);
      }
    });
  }

  if (filteredTasks.length === 0 && searchQuery.trim()) {
    return null;
  }

  return (
    <section
      id={`tasks-v2-event-${initialGroup.eventId}`}
      className="overflow-hidden border border-cos-border bg-cos-card"
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-3 border-b border-cos-border px-4 py-3 text-left transition-colors hover:bg-cos-bg/40"
        style={{ borderLeftWidth: 4, borderLeftColor: initialGroup.accentColor }}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
        )}
        <span
          className="font-display text-base text-cos-text"
          style={{ color: initialGroup.accentColor }}
        >
          {initialGroup.eventTitle}
        </span>
        <span className="rounded-full bg-cos-bg px-2 py-0.5 text-[10px] font-medium text-cos-muted tabular-nums">
          {filteredTasks.length}
        </span>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-cos-border bg-cos-bg/50 text-left text-[10px] font-semibold tracking-wide text-cos-muted uppercase">
                <th className="w-8 px-2 py-2" />
                <th className="w-6 px-0 py-2" />
                <th className="min-w-[14rem] px-3 py-2">Task</th>
                <th className="w-12 px-3 py-2">Owner</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Campaign / Event</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <TasksV2TaskRow
                  key={task.id}
                  task={task}
                  group={initialGroup}
                  status={resolveStatus(task.id, task.status)}
                  orgMembers={orgMembers}
                  isPending={pendingTaskIds.has(task.id)}
                  canEdit={canEdit}
                  draggable
                  dragOver={dragOverTaskId === task.id}
                  onOpen={() => setSelectedTaskId(task.id)}
                  onStatusChange={(status) => handleStatusChange(task, status)}
                  onAssigneeChange={(next) => handleAssigneeChange(task, next)}
                  onDueDateChange={(dueDate) =>
                    handleDueDateChange(task, dueDate)
                  }
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverTaskId(task.id);
                  }}
                  onDragLeave={() => setDragOverTaskId(null)}
                  onDrop={(event) => handleDrop(task.id, event)}
                />
              ))}
              {canEdit && (
                <TasksV2AddTaskRow
                  disabled={!canEdit}
                  isPending={pending}
                  requestExpand={requestExpandAdd}
                  onRequestExpandHandled={onExpandAddHandled}
                  onAdd={handleAddTask}
                />
              )}
            </tbody>
          </table>
        </div>
      )}

      <TasksV2TaskDetailDrawer
        task={selectedTask}
        canEdit={canEdit}
        onClose={() => setSelectedTaskId(null)}
        onNotesSaved={handleNotesSaved}
      />
    </section>
  );
}
