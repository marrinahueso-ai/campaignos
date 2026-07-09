"use client";

import { GripVertical, MessageSquare } from "lucide-react";
import { TasksV2EventPill } from "@/components/tasks-v2/TasksV2EventPill";
import { TasksV2OwnerAvatar } from "@/components/tasks-v2/TasksV2OwnerAvatar";
import { TasksV2PriorityPill } from "@/components/tasks-v2/TasksV2PriorityPill";
import { TasksV2StatusPill } from "@/components/tasks-v2/TasksV2StatusPill";
import { setTasksV2DragData } from "@/components/tasks-v2/tasks-v2-dnd";
import { deriveTaskPriority } from "@/lib/tasks-v2/derive-priority";
import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TasksV2EventGroup } from "@/types/tasks-v2";
import type { TaskHubTaskItem } from "@/types/task-hub";

interface TasksV2TaskRowProps {
  task: TaskHubTaskItem;
  group: TasksV2EventGroup;
  status: EventPlaybookTaskStatus;
  isPending?: boolean;
  canEdit?: boolean;
  draggable?: boolean;
  dragOver?: boolean;
  onStatusChange?: (status: EventPlaybookTaskStatus) => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent) => void;
}

export function TasksV2TaskRow({
  task,
  group,
  status,
  isPending,
  canEdit,
  draggable,
  dragOver,
  onStatusChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: TasksV2TaskRowProps) {
  const priority = deriveTaskPriority({ ...task, status });
  const displayDueDate = task.monday?.mondayDueDate ?? task.dueDate;

  return (
    <tr
      className={cn(
        "border-b border-cos-border/60 transition-colors hover:bg-cos-bg/40",
        isPending && "opacity-60",
        dragOver && "bg-cos-bg",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-drag-over={dragOver ? "true" : undefined}
    >
      <td className="w-8 px-2 py-2.5 align-middle">
        <input
          type="checkbox"
          checked={status === "done"}
          disabled={!canEdit || isPending}
          onChange={() => {
            if (onStatusChange) {
              onStatusChange(status === "done" ? "todo" : "done");
            }
          }}
          className="h-3.5 w-3.5 rounded border-cos-border text-cos-dark focus:ring-cos-accent/25"
          aria-label={`Mark ${task.title} as ${status === "done" ? "incomplete" : "complete"}`}
        />
      </td>
      <td className="w-6 px-0 py-2.5 align-middle">
        {draggable && canEdit && (
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              setTasksV2DragData(event, {
                taskId: task.id,
                eventId: task.event.eventId,
              });
              onDragStart?.(event);
            }}
            className="cursor-grab rounded p-0.5 text-cos-muted hover:text-cos-text active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>
      <td className="min-w-[14rem] px-3 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium text-cos-text",
              status === "done" && "text-cos-muted line-through",
            )}
          >
            {task.title}
          </span>
          {task.groupId && (
            <MessageSquare
              className="h-3.5 w-3.5 shrink-0 text-cos-muted"
              aria-label="Has comments"
            />
          )}
        </div>
      </td>
      <td className="w-12 px-3 py-2.5 align-middle">
        <TasksV2OwnerAvatar
          name={task.assigneeName}
          initials={task.assigneeInitials}
        />
      </td>
      <td className="px-3 py-2.5 align-middle">
        <TasksV2StatusPill
          status={status}
          onStatusChange={canEdit ? onStatusChange : undefined}
          disabled={isPending}
        />
      </td>
      <td className="px-3 py-2.5 align-middle">
        <TasksV2PriorityPill priority={priority} />
      </td>
      <td className="px-3 py-2.5 align-middle whitespace-nowrap text-sm text-cos-muted">
        {displayDueDate ? formatEventDate(displayDueDate) : "—"}
      </td>
      <td className="px-3 py-2.5 align-middle">
        <TasksV2EventPill
          title={group.eventTitle}
          accentColor={group.accentColor}
          href={group.eventHref}
        />
      </td>
    </tr>
  );
}
