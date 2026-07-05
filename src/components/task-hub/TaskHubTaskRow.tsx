"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import { TaskHubStatusPill } from "@/components/task-hub/TaskHubStatusPill";
import { resolveTaskDisplayStatus } from "@/lib/task-hub/grouping";
import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubOrgMember, TaskHubTaskItem } from "@/types/task-hub";

interface TaskHubTaskRowProps {
  task: TaskHubTaskItem;
  status: EventPlaybookTaskStatus;
  committeeName?: string;
  isPending?: boolean;
  disabled?: boolean;
  canEdit?: boolean;
  orgMembers?: TaskHubOrgMember[];
  draggable?: boolean;
  showGrip?: boolean;
  dragOver?: boolean;
  variant?: "table" | "board";
  onToggleStatus?: () => void;
  onStatusChange?: (status: EventPlaybookTaskStatus) => void;
  onTitleChange?: (title: string) => void;
  onDueDateChange?: (dueDate: string | null) => void;
  onAssigneeChange?: (assigneeName: string | null) => void;
  onDelete?: () => void;
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

function InlineTitleCell({
  title,
  isDone,
  canEdit,
  disabled,
  onSave,
}: {
  title: string;
  isDone: boolean;
  canEdit: boolean;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    } else {
      setDraft(title);
    }
  }

  if (!canEdit) {
    return (
      <p
        className={cn(
          "truncate font-medium text-cos-text",
          isDone && "text-cos-muted line-through",
        )}
      >
        {title}
      </p>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        disabled={disabled}
        className="w-full min-w-[8rem] rounded-sm border border-cos-border bg-cos-card px-2 py-1 text-sm font-medium text-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={cn(
        "block w-full truncate text-left font-medium text-cos-text hover:underline disabled:opacity-50",
        isDone && "text-cos-muted line-through",
      )}
    >
      {title}
    </button>
  );
}

function InlineAssigneeCell({
  assigneeName,
  assigneeInitials,
  canEdit,
  disabled,
  orgMembers,
  onSave,
}: {
  assigneeName: string | null;
  assigneeInitials: string | null;
  canEdit: boolean;
  disabled?: boolean;
  orgMembers: TaskHubOrgMember[];
  onSave: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(assigneeName ?? "");

  useEffect(() => {
    setDraft(assigneeName ?? "");
  }, [assigneeName]);

  if (!canEdit) {
    return <AssigneeAvatar name={assigneeName} initials={assigneeInitials} />;
  }

  if (editing) {
    return (
      <input
        type="text"
        list={orgMembers.length > 0 ? "task-hub-assignees" : undefined}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.trim();
          if (trimmed !== (assigneeName ?? "")) {
            onSave(trimmed || null);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            setDraft(assigneeName ?? "");
            setEditing(false);
          }
        }}
        autoFocus
        disabled={disabled}
        placeholder="Assign owner"
        className="w-full min-w-[6rem] rounded-sm border border-cos-border bg-cos-card px-2 py-1 text-sm text-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-left disabled:opacity-50"
    >
      <AssigneeAvatar name={assigneeName} initials={assigneeInitials} />
    </button>
  );
}

function InlineDueDateCell({
  dueDate,
  mondayDueDate,
  canEdit,
  disabled,
  onSave,
}: {
  dueDate: string | null;
  mondayDueDate?: string | null;
  canEdit: boolean;
  disabled?: boolean;
  onSave: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const displayDueDate = mondayDueDate ?? dueDate;

  if (!canEdit) {
    if (!displayDueDate) {
      return <span className="text-sm text-cos-muted">—</span>;
    }
    return (
      <span className="text-sm text-cos-text tabular-nums">
        {formatEventDate(displayDueDate)}
        {mondayDueDate && (
          <span className="ml-1 text-[10px] text-cos-muted">Mon</span>
        )}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={dueDate ?? ""}
        onBlur={(event) => {
          setEditing(false);
          const value = event.target.value || null;
          if (value !== dueDate) {
            onSave(value);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setEditing(false);
          }
        }}
        autoFocus
        disabled={disabled}
        className="rounded-sm border border-cos-border bg-cos-card px-2 py-1 text-sm text-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="text-left text-sm text-cos-text tabular-nums hover:underline disabled:opacity-50"
    >
      {displayDueDate ? (
        <>
          {formatEventDate(displayDueDate)}
          {mondayDueDate && (
            <span className="ml-1 text-[10px] text-cos-muted">Mon</span>
          )}
        </>
      ) : (
        <span className="text-cos-muted">Set date</span>
      )}
    </button>
  );
}

export function TaskHubTaskRow({
  task,
  status,
  committeeName,
  isPending,
  disabled,
  canEdit = false,
  orgMembers = [],
  draggable,
  showGrip,
  dragOver,
  variant = "table",
  onToggleStatus,
  onStatusChange,
  onTitleChange,
  onDueDateChange,
  onAssigneeChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: TaskHubTaskRowProps) {
  const mondayOverlay = task.monday;
  const displayStatus = resolveTaskDisplayStatus(task, status);
  const displayDueDate = mondayOverlay?.mondayDueDate ?? task.dueDate;
  const isDone = displayStatus === "done";
  const editable = canEdit && !disabled;

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
            onStatusChange={editable ? onStatusChange : undefined}
            onClick={!editable && onToggleStatus ? onToggleStatus : undefined}
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
        <InlineTitleCell
          title={task.title}
          isDone={isDone}
          canEdit={editable && Boolean(onTitleChange)}
          disabled={isPending}
          onSave={(value) => onTitleChange?.(value)}
        />
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
        <InlineAssigneeCell
          assigneeName={task.assigneeName}
          assigneeInitials={task.assigneeInitials}
          canEdit={editable && Boolean(onAssigneeChange)}
          disabled={isPending}
          orgMembers={orgMembers}
          onSave={(value) => onAssigneeChange?.(value)}
        />
      </td>
      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center gap-1.5">
          <TaskHubStatusPill
            status={displayStatus}
            onStatusChange={editable ? onStatusChange : undefined}
            onClick={!editable && onToggleStatus ? onToggleStatus : undefined}
            disabled={disabled || isPending}
          />
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cos-muted" aria-hidden />
          )}
        </div>
      </td>
      <td className="hidden px-3 py-2.5 align-middle sm:table-cell">
        <InlineDueDateCell
          dueDate={task.dueDate}
          mondayDueDate={mondayOverlay?.mondayDueDate}
          canEdit={editable && Boolean(onDueDateChange)}
          disabled={isPending}
          onSave={(value) => onDueDateChange?.(value)}
        />
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <MondaySyncBadge task={task} />
      </td>
      <td className="w-10 px-2 py-2.5 align-middle">
        {editable && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="rounded-sm p-1 text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-error disabled:opacity-50"
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
