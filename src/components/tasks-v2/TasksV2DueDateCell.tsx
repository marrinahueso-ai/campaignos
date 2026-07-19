"use client";

import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface TasksV2DueDateCellProps {
  dueDate: string | null;
  canEdit: boolean;
  disabled?: boolean;
  onChange: (dueDate: string | null) => void;
}

export function TasksV2DueDateCell({
  dueDate,
  canEdit,
  disabled,
  onChange,
}: TasksV2DueDateCellProps) {
  if (!canEdit) {
    return (
      <span className="text-sm text-cos-muted tabular-nums">
        {dueDate ? formatEventDate(dueDate) : "—"}
      </span>
    );
  }

  return (
    <input
      type="date"
      value={dueDate ?? ""}
      disabled={disabled}
      aria-label="Due date"
      onChange={(event) => {
        const value = event.target.value || null;
        if (value !== dueDate) {
          onChange(value);
        }
      }}
      className={cn(
        "max-w-[9.5rem] rounded-md border border-cos-border bg-cos-card px-2 py-1 text-xs text-cos-text",
        "focus:border-cos-accent focus:outline-none focus:ring-1 focus:ring-cos-accent/25",
        "disabled:opacity-50",
        !dueDate && "text-cos-muted",
      )}
    />
  );
}
