"use client";

import Link from "next/link";
import { ExternalLink, GripVertical, Loader2 } from "lucide-react";
import { TaskHubStatusPill } from "@/components/task-hub/TaskHubStatusPill";
import { resolveTaskDisplayStatus } from "@/lib/task-hub/grouping";
import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubTaskItem } from "@/types/task-hub";

interface TaskHubTaskRowProps {
  task: TaskHubTaskItem;
  status: EventPlaybookTaskStatus;
  committeeName?: string;
  isPending?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  showGrip?: boolean;
  dragOver?: boolean;
  variant?: "table" | "board";
  onToggleStatus: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent) => void;
}

function AssigneeAvatar({
  name,
  initials,
}: {
  name: string | null;
  initials: string | null;
}) {
  if (initials) {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cos-dark text-[10px] font-semibold text-[#f6f2eb]"
        title={name ?? undefined}
      >
        {initials}
      </span>
    );
  }

  if (name) {
    return <span className="truncate text-sm text-cos-text">{name}</span>;
  }

  return <span className="text-sm text-cos-muted">—</span>;
}

function MondaySyncBadge({ task }: { task: TaskHubTaskItem }) {
  const mondayOverlay = task.monday;
  if (!mondayOverlay) {
    return <span className="text-cos-muted">—</span>;
  }

  const badge = (
    <span className="inline-flex items-center rounded-full bg-cos-bg-alt px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cos-muted uppercase ring-1 ring-cos-border">
      Mon
    </span>
  );

  if (mondayOverlay.mondayItemUrl) {
    return (
      <a
        href={mondayOverlay.mondayItemUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex transition-opacity hover:opacity-75"
        title="Open in Monday.com"
      >
        {badge}
      </a>
    );
  }

  return badge;
}

export function TaskHubTaskRow({
  task,
  status,
  committeeName,
  isPending,
  disabled,
  draggable,
  showGrip,
  dragOver,
  variant = "table",
  onToggleStatus,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: TaskHubTaskRowProps) {
  const mondayOverlay = task.monday;
  const displayStatus = resolveTaskDisplayStatus(task, status);
  const displayDueDate = mondayOverlay?.mondayDueDate ?? task.dueDate;
  const isDone = displayStatus === "done";

  if (variant === "board") {
    return (
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="task-hub-board-card m-2 p-3"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-medium leading-snug text-cos-text",
                isDone && "text-cos-muted line-through",
              )}
            >
              {task.title}
            </p>
            {committeeName && (
              <p className="mt-1 truncate text-xs text-cos-muted">{committeeName}</p>
            )}
            <Link
              href={task.event.eventHref}
              className="mt-1 inline-flex items-center gap-1 truncate text-xs text-cos-muted hover:text-cos-text"
            >
              {task.event.eventTitle}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
            {displayDueDate && (
              <p className="mt-1.5 text-xs text-cos-muted">
                Due {formatEventDate(displayDueDate)}
                {mondayOverlay?.mondayDueDate ? " · Monday" : ""}
              </p>
            )}
          </div>
          {task.assigneeInitials && (
            <AssigneeAvatar name={task.assigneeName} initials={task.assigneeInitials} />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <TaskHubStatusPill
            status={displayStatus}
            onClick={onToggleStatus}
            disabled={disabled || isPending}
          />
          <div className="flex items-center gap-1.5">
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cos-muted" aria-hidden />
            )}
            <MondaySyncBadge task={task} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-drag-over={dragOver ? "true" : undefined}
      className={cn(isPending && "opacity-70")}
    >
      <td className="w-8 px-2 py-2.5 align-middle">
        {showGrip && (
          <GripVertical
            className="h-4 w-4 cursor-grab text-cos-muted active:cursor-grabbing"
            aria-hidden
          />
        )}
      </td>
      <td className="max-w-[14rem] px-3 py-2.5 align-middle">
        <p
          className={cn(
            "truncate font-medium text-cos-text",
            isDone && "text-cos-muted line-through",
          )}
        >
          {task.title}
        </p>
      </td>
      <td className="hidden max-w-[8rem] px-3 py-2.5 align-middle md:table-cell">
        <span className="truncate text-cos-muted">{committeeName ?? "—"}</span>
      </td>
      <td className="max-w-[10rem] px-3 py-2.5 align-middle">
        <Link
          href={task.event.eventHref}
          className="inline-flex max-w-full items-center gap-1 truncate text-cos-muted hover:text-cos-text"
        >
          <span className="truncate">{task.event.eventTitle}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </Link>
      </td>
      <td className="hidden max-w-[8rem] px-3 py-2.5 align-middle lg:table-cell">
        <AssigneeAvatar name={task.assigneeName} initials={task.assigneeInitials} />
      </td>
      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center gap-1.5">
          <TaskHubStatusPill
            status={displayStatus}
            onClick={onToggleStatus}
            disabled={disabled || isPending}
          />
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cos-muted" aria-hidden />
          )}
        </div>
      </td>
      <td className="hidden px-3 py-2.5 align-middle sm:table-cell">
        {displayDueDate ? (
          <span className="text-sm text-cos-text tabular-nums">
            {formatEventDate(displayDueDate)}
            {mondayOverlay?.mondayDueDate && (
              <span className="ml-1 text-[10px] text-cos-muted">Mon</span>
            )}
          </span>
        ) : (
          <span className="text-sm text-cos-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <MondaySyncBadge task={task} />
      </td>
    </tr>
  );
}
