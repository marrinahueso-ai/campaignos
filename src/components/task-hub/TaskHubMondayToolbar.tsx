"use client";

import {
  ArrowDownAZ,
  EyeOff,
  Filter,
  Layers,
  Plus,
  Search,
  User,
} from "lucide-react";
import type {
  MondayBoardSortMode,
  MondayBoardStatusFilter,
} from "@/lib/task-hub/monday-filters";

const SORT_OPTIONS: { value: MondayBoardSortMode; label: string }[] = [
  { value: "default", label: "Board order" },
  { value: "name", label: "Event name" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "timeline", label: "Timeline" },
];

interface TaskHubMondayToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortMode: MondayBoardSortMode;
  onSortChange: (value: MondayBoardSortMode) => void;
  statusFilter: MondayBoardStatusFilter;
  onStatusFilterChange: (value: MondayBoardStatusFilter) => void;
  statusOptions: string[];
  personFilter: string;
  onPersonFilterChange: (value: string) => void;
  orgMembers: { id: string; displayName: string }[];
  itemCount: number;
  filteredCount: number;
  canEdit: boolean;
  onNewEvent: () => void;
  hiddenColumns: Set<string>;
  onToggleColumn: (columnId: string) => void;
  visibleColumnIds: { id: string; label: string }[];
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
        className="max-w-[9rem] cursor-pointer bg-transparent text-xs font-medium text-cos-text outline-none"
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

export function TaskHubMondayToolbar({
  searchQuery,
  onSearchChange,
  sortMode,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  personFilter,
  onPersonFilterChange,
  orgMembers,
  itemCount,
  filteredCount,
  canEdit,
  onNewEvent,
  hiddenColumns,
  onToggleColumn,
  visibleColumnIds,
}: TaskHubMondayToolbarProps) {
  const isFiltered =
    searchQuery.trim() !== "" || statusFilter !== "all" || personFilter.trim() !== "";

  const statusFilterOptions: { value: MondayBoardStatusFilter; label: string }[] = [
    { value: "all", label: "All statuses" },
    ...statusOptions.map((status) => ({ value: status, label: status })),
  ];

  return (
    <div className="cos-card overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-cos-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onNewEvent}
              className="inline-flex items-center gap-1.5 rounded-md bg-cos-dark px-3 py-2 text-xs font-semibold text-[#f6f2eb] transition-colors hover:bg-cos-primary-hover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New event
            </button>
          )}

          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search events & subitems…"
              className="w-full rounded-md border border-cos-border bg-cos-bg py-2 pr-3 pl-9 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none focus:ring-2 focus:ring-cos-accent/25"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarSelect
            label="Filter by person"
            icon={User}
            value={personFilter}
            options={[
              { value: "", label: "Everyone" },
              ...orgMembers.map((member) => ({
                value: member.displayName,
                label: member.displayName,
              })),
            ]}
            onChange={onPersonFilterChange}
          />
          <ToolbarSelect
            label="Filter by status"
            icon={Filter}
            value={statusFilter}
            options={statusFilterOptions}
            onChange={onStatusFilterChange}
          />
          <ToolbarSelect
            label="Sort events"
            icon={ArrowDownAZ}
            value={sortMode}
            options={SORT_OPTIONS}
            onChange={onSortChange}
          />
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2 py-1.5 text-xs font-medium text-cos-text hover:border-cos-accent/50">
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
              Hide
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-md border border-cos-border bg-cos-card p-2 shadow-lg">
              {visibleColumnIds.map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-cos-bg"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.has(column.id)}
                    onChange={() => onToggleColumn(column.id)}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </details>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-cos-border bg-cos-card px-2 py-1.5 text-xs text-cos-muted">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Phase groups
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end px-4 py-2 text-xs text-cos-muted tabular-nums">
        {isFiltered ? `${filteredCount} of ${itemCount} events` : `${itemCount} events`}
      </div>
    </div>
  );
}
