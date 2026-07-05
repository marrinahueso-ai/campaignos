"use client";

import { useEffect, useRef, useState } from "react";
import { taskStatusLabel, TASK_STATUS_CYCLE } from "@/lib/event-playbooks/task-status";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

interface TaskHubStatusPillProps {
  status: EventPlaybookTaskStatus;
  onClick?: () => void;
  onStatusChange?: (status: EventPlaybookTaskStatus) => void;
  disabled?: boolean;
  className?: string;
}

const STATUS_PILL_CLASS: Record<EventPlaybookTaskStatus, string> = {
  todo: "cos-status-pill cos-status-pill--todo",
  in_progress: "cos-status-pill cos-status-pill--in-progress",
  blocked: "cos-status-pill cos-status-pill--blocked",
  done: "cos-status-pill cos-status-pill--done",
};

export function TaskHubStatusPill({
  status,
  onClick,
  onStatusChange,
  disabled,
  className,
}: TaskHubStatusPillProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = taskStatusLabel(status);
  const pillClass = STATUS_PILL_CLASS[status];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (onStatusChange) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen((value) => !value)}
          disabled={disabled}
          className={cn(pillClass, "cursor-pointer disabled:opacity-50", className)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Status: ${label}. Click to change.`}
        >
          {label}
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute left-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-md border border-cos-border bg-cos-card py-1 shadow-lg"
          >
            {TASK_STATUS_CYCLE.map((option) => (
              <li key={option} role="option" aria-selected={option === status}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (option !== status) {
                      onStatusChange(option);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-cos-bg",
                    option === status && "bg-cos-bg font-medium",
                  )}
                >
                  <span className={cn(STATUS_PILL_CLASS[option], "pointer-events-none scale-90")}>
                    {taskStatusLabel(option)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(pillClass, "cursor-pointer disabled:opacity-50", className)}
        aria-label={`Change status from ${label}`}
      >
        {label}
      </button>
    );
  }

  return <span className={cn(pillClass, className)}>{label}</span>;
}
