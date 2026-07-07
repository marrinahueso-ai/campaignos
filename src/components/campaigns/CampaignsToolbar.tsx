"use client";

import { CalendarDays, ChevronDown, List, Search } from "lucide-react";
import {
  CAMPAIGN_STATUS_FILTER_OPTIONS,
  CAMPAIGN_TYPE_FILTER_OPTIONS,
  type CampaignStatusFilter,
  type CampaignTypeFilter,
  type CampaignViewMode,
} from "@/lib/events/campaign-page-filters";
import { cn } from "@/lib/utils/cn";

interface CampaignsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: CampaignStatusFilter;
  onStatusFilterChange: (value: CampaignStatusFilter) => void;
  typeFilter: CampaignTypeFilter;
  onTypeFilterChange: (value: CampaignTypeFilter) => void;
  viewMode: CampaignViewMode;
  onViewModeChange: (value: CampaignViewMode) => void;
}

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={label}
        className="h-10 min-w-[9.5rem] cursor-pointer appearance-none rounded-lg border border-cos-border bg-white py-2 pl-3 pr-8 text-sm text-cos-text focus:border-cos-text/30 focus:outline-none focus:ring-1 focus:ring-cos-text/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center gap-1 text-cos-muted">
        <span className="sr-only">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </span>
    </div>
  );
}

function ViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: CampaignViewMode;
  onViewModeChange: (value: CampaignViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Campaign view"
      className="inline-flex items-center rounded-lg border border-cos-border bg-white p-0.5"
    >
      <button
        type="button"
        onClick={() => onViewModeChange("month")}
        aria-pressed={viewMode === "month"}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
          viewMode === "month"
            ? "bg-[var(--cos-status-todo-bg)] text-[var(--cos-status-todo-text)]"
            : "text-cos-muted hover:text-cos-text",
        )}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        Month
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        aria-pressed={viewMode === "list"}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
          viewMode === "list"
            ? "bg-[var(--cos-status-todo-bg)] text-[var(--cos-status-todo-text)]"
            : "text-cos-muted hover:text-cos-text",
        )}
      >
        <List className="h-4 w-4" aria-hidden />
        List
      </button>
    </div>
  );
}

export function CampaignsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  viewMode,
  onViewModeChange,
}: CampaignsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 sm:w-64">
          <span className="sr-only">Search campaigns</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search campaigns"
            className="h-10 w-full rounded-lg border border-cos-border bg-white py-2 pr-3 pl-9 text-sm text-cos-text placeholder:text-cos-muted/70 focus:border-cos-text/30 focus:outline-none focus:ring-1 focus:ring-cos-text/10"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="Filter by status"
            value={statusFilter}
            options={CAMPAIGN_STATUS_FILTER_OPTIONS}
            onChange={onStatusFilterChange}
          />
          <FilterDropdown
            label="Filter by type"
            value={typeFilter}
            options={CAMPAIGN_TYPE_FILTER_OPTIONS}
            onChange={onTypeFilterChange}
          />
        </div>
      </div>

      <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  );
}
