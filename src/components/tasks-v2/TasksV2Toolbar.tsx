"use client";

import {
  ArrowDownAZ,
  ChevronDown,
  Filter,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  User,
} from "lucide-react";
import { taskStatusLabel } from "@/lib/event-playbooks/task-status";
import type {
  TaskHubSortMode,
  TaskHubStatusFilter,
} from "@/lib/task-hub/list-filters";
import type { TaskHubEventOption, TaskHubOrgMember } from "@/types/task-hub";

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
  canEdit: boolean;
  events: TaskHubEventOption[];
  orgMembers: TaskHubOrgMember[];
  onNewTask: (eventId: string) => void;
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
    <label className="inline-flex items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2.5 py-1.5 text-xs text-cos-muted transition-colors hover:border-cos-accent/50 hover:text-cos-text">
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
  canEdit,
  events,
  orgMembers,
  onNewTask,
}: TasksV2ToolbarProps) {
  const isFiltered =
    searchQuery.trim() !== "" || statusFilter !== "all" || personFilter !== "";

  return (
    <div className="flex flex-col gap-3 border-b border-cos-border bg-cos-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && events.length > 0 && (
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={() => onNewTask(events[0]!.eventId)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#2a2622] px-3 py-1.5 text-xs font-medium text-[#f6f2eb] transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </div>
        )}

        <div className="relative min-w-0 flex-1 sm:max-w-[12rem]">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="w-full rounded-md border border-cos-border bg-cos-bg py-1.5 pr-2 pl-8 text-xs text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none focus:ring-1 focus:ring-cos-accent/25"
          />
        </div>

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
            onChange={(event) => onSortChange(event.target.value as TaskHubSortMode)}
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
          className="inline-flex items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2.5 py-1.5 text-xs text-cos-muted transition-colors hover:text-cos-text"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Group by</span>
        </button>

        <button
          type="button"
          aria-label="More options"
          className="inline-flex items-center rounded-md border border-cos-border bg-cos-card p-1.5 text-cos-muted transition-colors hover:text-cos-text"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <span className="text-xs text-cos-muted tabular-nums">
        {isFiltered ? `${filteredCount} of ${taskCount}` : `${taskCount} tasks`}
      </span>
    </div>
  );
}
