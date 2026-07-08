"use client";

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
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={label}
      className="h-10 min-w-[9.5rem] cursor-pointer rounded-md border border-cos-border bg-cos-card px-3 text-sm text-cos-text focus:border-cos-accent focus:outline-none focus:ring-2 focus:ring-cos-accent/25"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
      className="inline-flex items-center rounded-md border border-cos-border bg-cos-card p-0.5"
    >
      <button
        type="button"
        onClick={() => onViewModeChange("month")}
        aria-pressed={viewMode === "month"}
        className={cn(
          "inline-flex h-9 items-center rounded px-3 text-sm font-medium transition-colors",
          viewMode === "month"
            ? "bg-cos-bg text-cos-text"
            : "text-cos-muted hover:text-cos-text",
        )}
      >
        Month
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        aria-pressed={viewMode === "list"}
        className={cn(
          "inline-flex h-9 items-center rounded px-3 text-sm font-medium transition-colors",
          viewMode === "list"
            ? "bg-cos-bg text-cos-text"
            : "text-cos-muted hover:text-cos-text",
        )}
      >
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
        <label htmlFor="campaigns-search" className="block min-w-0 sm:w-64">
          <span className="sr-only">Search campaigns</span>
          <input
            id="campaigns-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search campaigns"
            className="h-10 w-full rounded-md border border-cos-border bg-cos-bg px-3 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none focus:ring-2 focus:ring-cos-accent/25"
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
