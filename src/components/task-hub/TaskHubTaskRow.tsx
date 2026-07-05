"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  GripVertical,
  Loader2,
  OctagonAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { nextTaskStatus, taskStatusLabel } from "@/lib/event-playbooks/task-status";
import { mondayLabelToCampaignOsStatus } from "@/lib/monday/status-mapping";
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
  compact?: boolean;
  onToggleStatus: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent) => void;
}

function statusBadge(status: EventPlaybookTaskStatus) {
  switch (status) {
    case "in_progress":
      return <Badge variant="info">{taskStatusLabel(status)}</Badge>;
    case "blocked":
      return <Badge variant="warning">{taskStatusLabel(status)}</Badge>;
    case "done":
      return <Badge variant="success">{taskStatusLabel(status)}</Badge>;
    default:
      return null;
  }
}

function StatusIcon({
  status,
  isPending,
}: {
  status: EventPlaybookTaskStatus;
  isPending?: boolean;
}) {
  if (isPending) {
    return <Loader2 className="h-5 w-5 animate-spin text-cos-muted" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="h-5 w-5 text-cos-success-text" />;
  }
  if (status === "in_progress") {
    return <Loader2 className="h-5 w-5 text-cos-info-text" />;
  }
  if (status === "blocked") {
    return <OctagonAlert className="h-5 w-5 text-cos-warning-text" />;
  }
  return <Circle className="h-5 w-5" strokeWidth={1.5} />;
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
  compact,
  onToggleStatus,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: TaskHubTaskRowProps) {
  const mondayOverlay = task.monday;
  const overlayStatus =
    mondayOverlay?.mondayStatusLabel != null
      ? mondayLabelToCampaignOsStatus(mondayOverlay.mondayStatusLabel) ?? status
      : status;
  const displayStatus = mondayOverlay ? overlayStatus : status;
  const displayDueDate = mondayOverlay?.mondayDueDate ?? task.dueDate;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-cos-bg/60",
        dragOver && "bg-cos-bg ring-1 ring-inset ring-cos-dark",
      )}
    >
      {showGrip && (
        <GripVertical
          className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-cos-muted active:cursor-grabbing"
          aria-hidden
        />
      )}

      <button
        type="button"
        onClick={onToggleStatus}
        disabled={disabled || isPending}
        className="mt-0.5 shrink-0 text-cos-muted hover:text-cos-text disabled:opacity-50"
        aria-label={`Mark ${task.title} as ${taskStatusLabel(nextTaskStatus(status))}`}
      >
        <StatusIcon status={displayStatus} isPending={isPending} />
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
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cos-muted">
            {committeeName && <span>{committeeName}</span>}
            <Link
              href={task.event.eventHref}
              className="inline-flex items-center gap-1 hover:text-cos-text"
            >
              {task.event.eventTitle}
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span>{formatEventDate(task.event.eventDate)}</span>
            {displayDueDate && (
              <span>
                Due {formatEventDate(displayDueDate)}
                {mondayOverlay?.mondayDueDate ? " · Monday" : ""}
              </span>
            )}
            {task.assigneeName && <span>{task.assigneeName}</span>}
          </div>
        )}
        {compact && displayDueDate && (
          <p className="mt-0.5 text-xs text-cos-muted">
            Due {formatEventDate(displayDueDate)}
            {mondayOverlay?.mondayDueDate ? " · Monday" : ""}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {statusBadge(displayStatus)}
        {mondayOverlay && (
          mondayOverlay.mondayItemUrl ? (
            <a
              href={mondayOverlay.mondayItemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Badge variant="default">Monday</Badge>
            </a>
          ) : (
            <Badge variant="default">Monday</Badge>
          )
        )}
        {task.assigneeInitials && (
          <span className="flex h-7 w-7 items-center justify-center bg-cos-dark text-[10px] font-medium text-[#f6f2eb]">
            {task.assigneeInitials}
          </span>
        )}
      </div>
    </div>
  );
}
