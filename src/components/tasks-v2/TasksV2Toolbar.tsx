"use client";

import { MoreHorizontal, Search } from "lucide-react";
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

function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={ariaLabel}
      className="h-9 min-w-0 border border-cos-border bg-cos-card px-2.5 text-xs text-cos-text outline-none focus:border-cos-dark"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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

  const personOptions = [
    { value: "", label: "All people" },
    ...orgMembers
      .filter((member) => member.userId)
      .map((member) => ({
        value: member.userId!,
        label: member.displayName,
      })),
  ];

  return (
    <div className="border-b border-cos-border bg-cos-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          ariaLabel="Filter by person"
          value={personFilter}
          options={personOptions}
          onChange={onPersonFilterChange}
        />

        <FilterSelect
          ariaLabel="Filter by status"
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={onStatusFilterChange}
        />

        <FilterSelect
          ariaLabel="Sort tasks"
          value={sortMode}
          options={SORT_OPTIONS}
          onChange={onSortChange}
        />

        <button
          type="button"
          aria-label="More options"
          className="inline-flex h-9 w-9 items-center justify-center border border-cos-border bg-cos-card text-cos-muted transition-colors hover:text-cos-text"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <span className="text-xs text-cos-muted tabular-nums">
          {isFiltered
            ? `${filteredCount} of ${taskCount}`
            : `${taskCount} tasks`}
        </span>

        <label className="relative ml-auto min-w-[12rem] flex-1 basis-[14rem] sm:max-w-sm">
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
            className="h-9 w-full border border-cos-border bg-cos-bg py-0 pr-3 pl-9 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
