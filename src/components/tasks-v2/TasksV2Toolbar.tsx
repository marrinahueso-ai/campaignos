"use client";

import {
  ArrowDownAZ,
  Filter,
  Layers,
  MoreHorizontal,
  Search,
  User,
} from "lucide-react";
import { taskStatusLabel } from "@/lib/event-playbooks/task-status";
import type {
  TaskHubSortMode,
  TaskHubStatusFilter,
} from "@/lib/task-hub/list-filters";
import type { TaskHubOrgMember } from "@/types/task-hub";

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

interface TasksV2ToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortMode: TaskHubSortMode;
  onSortChange: (value: TaskHubSortMode) => void;
  statusFilter: TaskHubStatusFilter;
  onStatusFilterChange: (value: TaskHubStatusFilter) => void;
  personFilter: string;
  onPersonFilterChange: (value: string) => void;
  taskCount: number;
  filteredCount: number;
  orgMembers: TaskHubOrgMember[];
}

function ToolbarButton({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Filter;
  children?: React.ReactNode;
}) {
  return (
    <label className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2.5 text-xs text-cos-muted transition-colors hover:border-cos-accent/50 hover:text-cos-text">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      {children}
    </label>
  );
}

export function TasksV2Toolbar({
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  personFilter,
  onPersonFilterChange,
  taskCount,
  filteredCount,
  orgMembers,
}: TasksV2ToolbarProps) {
  const isFiltered =
    searchQuery.trim() !== "" || statusFilter !== "all" || personFilter !== "";

  return (
    <div className="space-y-3 border-b border-cos-border bg-cos-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton label="Person" icon={User}>
          <select
            value={personFilter}
            onChange={(event) => onPersonFilterChange(event.target.value)}
            aria-label="Filter by person"
            className="max-w-[8rem] cursor-pointer bg-transparent text-xs font-medium text-cos-text outline-none"
          >
            <option value="">All</option>
            {orgMembers
              .filter((member) => member.userId)
              .map((member) => (
                <option key={member.id} value={member.userId!}>
                  {member.displayName}
                </option>
              ))}
          </select>
        </ToolbarButton>

        <ToolbarButton label="Filter" icon={Filter}>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as TaskHubStatusFilter)
            }
            aria-label="Filter by status"
            className="max-w-[7rem] cursor-pointer bg-transparent text-xs font-medium text-cos-text outline-none"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarButton>

        <ToolbarButton label="Sort" icon={ArrowDownAZ}>
          <select
            value={sortMode}
            onChange={(event) =>
              onSortChange(event.target.value as TaskHubSortMode)
            }
            aria-label="Sort tasks"
            className="max-w-[7rem] cursor-pointer bg-transparent text-xs font-medium text-cos-text outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarButton>

        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2.5 text-xs text-cos-muted transition-colors hover:text-cos-text"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Group by</span>
        </button>

        <button
          type="button"
          aria-label="More options"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-cos-border bg-cos-card text-cos-muted transition-colors hover:text-cos-text"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <span className="ml-auto text-xs text-cos-muted tabular-nums">
          {isFiltered
            ? `${filteredCount} of ${taskCount}`
            : `${taskCount} tasks`}
        </span>
      </div>

      <div className="flex justify-end">
        <label className="relative w-full sm:max-w-md sm:min-w-[20rem]">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="h-10 w-full rounded-md border border-cos-border bg-cos-bg py-2 pr-3 pl-10 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none focus:ring-1 focus:ring-cos-accent/25"
          />
        </label>
      </div>
    </div>
  );
}
