"use client";

import {
  ArrowDownAZ,
  Calendar,
  Filter,
  Layers,
  Search,
  User,
} from "lucide-react";
import { taskStatusLabel } from "@/lib/event-playbooks/task-status";
import type {
  TaskHubSortMode,
  TaskHubStatusFilter,
} from "@/lib/task-hub/list-filters";
import { cn } from "@/lib/utils/cn";
import type { TaskHubSecondaryGroupMode } from "@/types/task-hub";

const SORT_OPTIONS: { value: TaskHubSortMode; label: string }[] = [
  { value: "default", label: "Manual order" },
  { value: "title", label: "Task name" },
  { value: "due_date_asc", label: "Due date (earliest)" },
  { value: "due_date_desc", label: "Due date (latest)" },
  { value: "status", label: "Status" },
];

const STATUS_FILTER_OPTIONS: { value: TaskHubStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "todo", label: taskStatusLabel("todo") },
  { value: "in_progress", label: taskStatusLabel("in_progress") },
  { value: "blocked", label: taskStatusLabel("blocked") },
  { value: "done", label: taskStatusLabel("done") },
];

const GROUP_OPTIONS: {
  value: TaskHubSecondaryGroupMode;
  label: string;
  icon: typeof Layers;
}[] = [
  { value: "none", label: "Flat list", icon: Layers },
  { value: "status", label: "Status", icon: Filter },
  { value: "assignee", label: "Owner", icon: User },
  { value: "due_date", label: "Due date", icon: Calendar },
];

interface TaskHubToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortMode: TaskHubSortMode;
  onSortChange: (value: TaskHubSortMode) => void;
  statusFilter: TaskHubStatusFilter;
  onStatusFilterChange: (value: TaskHubStatusFilter) => void;
  secondaryGroupMode: TaskHubSecondaryGroupMode;
  onSecondaryGroupChange: (value: TaskHubSecondaryGroupMode) => void;
  taskCount: number;
  filteredCount: number;
}

function ToolbarSelect<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: typeof Filter;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2 py-1.5 text-xs text-cos-muted transition-colors hover:border-cos-accent/50 hover:text-cos-text">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={label}
        className="max-w-[8rem] cursor-pointer bg-transparent text-xs font-medium text-cos-text outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TaskHubToolbar({
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  secondaryGroupMode,
  onSecondaryGroupChange,
  taskCount,
  filteredCount,
}: TaskHubToolbarProps) {
  const isFiltered = searchQuery.trim() !== "" || statusFilter !== "all";

  return (
    <div className="cos-card overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-cos-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-md border border-cos-border bg-cos-bg py-2 pr-3 pl-9 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none focus:ring-2 focus:ring-cos-accent/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarSelect
            label="Filter by status"
            icon={Filter}
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={onStatusFilterChange}
          />
          <ToolbarSelect
            label="Sort tasks"
            icon={ArrowDownAZ}
            value={sortMode}
            options={SORT_OPTIONS}
            onChange={onSortChange}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <span className="text-[11px] font-medium tracking-wide text-cos-muted uppercase">
          Group within committee
        </span>
        {GROUP_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = secondaryGroupMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSecondaryGroupChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-cos-dark text-[#f6f2eb]"
                  : "bg-cos-bg text-cos-muted ring-1 ring-cos-border hover:text-cos-text",
              )}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {option.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-cos-muted tabular-nums">
          {isFiltered ? `${filteredCount} of ${taskCount}` : `${taskCount} tasks`}
        </span>
      </div>
    </div>
  );
}
