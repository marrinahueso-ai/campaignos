"use client";

import {
  ChevronDown,
  Grid3x3,
  List,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  buildMonthFilterOptions,
  buildOwnerFilterOptions,
  buildSchoolYearFilterOptions,
  CAMPAIGN_SORT_OPTIONS,
  CAMPAIGN_STATUS_FILTER_OPTIONS,
  CAMPAIGN_TYPE_FILTER_OPTIONS,
  type CampaignPageFilterState,
  type CampaignSortField,
  type CampaignTabFilter,
  type CampaignViewMode,
} from "@/lib/events/campaign-page-filters";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

const TAB_OPTIONS: { value: CampaignTabFilter; label: string }[] = [
  { value: "all", label: "All campaigns" },
  { value: "full_campaign", label: "Full campaigns" },
  { value: "reminder_only", label: "Reminders only" },
];

interface CampaignsToolbarProps {
  events: Event[];
  filters: CampaignPageFilterState;
  viewMode: CampaignViewMode;
  showMoreFilters: boolean;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  schoolYears?: Array<{ id: string; label: string }>;
  onFiltersChange: (filters: CampaignPageFilterState) => void;
  onViewModeChange: (mode: CampaignViewMode) => void;
  onShowMoreFiltersChange: (open: boolean) => void;
  onClearFilters: () => void;
}

function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={ariaLabel}
      className={cn(
        "h-9 min-w-0 cursor-pointer border border-cos-border bg-cos-card px-2.5 text-xs text-cos-text outline-none focus:border-cos-dark",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CampaignsToolbar({
  events,
  filters,
  viewMode,
  showMoreFilters,
  ownershipByEventId,
  schoolYears = [],
  onFiltersChange,
  onViewModeChange,
  onShowMoreFiltersChange,
  onClearFilters,
}: CampaignsToolbarProps) {
  const monthOptions = buildMonthFilterOptions(events);
  const ownerOptions = buildOwnerFilterOptions(events, ownershipByEventId);
  const schoolYearOptions = buildSchoolYearFilterOptions(schoolYears);

  function patchFilters(patch: Partial<CampaignPageFilterState>) {
    onFiltersChange({ ...filters, ...patch });
  }

  function patchMore(patch: Partial<CampaignPageFilterState["more"]>) {
    onFiltersChange({
      ...filters,
      more: { ...filters.more, ...patch },
    });
  }

  function handleSortFieldChange(field: CampaignSortField) {
    patchFilters({ sortField: field });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-6 border-b border-cos-border">
          {TAB_OPTIONS.map((tab) => {
            const isActive = filters.tab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => patchFilters({ tab: tab.value, summary: "all" })}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-cos-dark text-cos-text"
                    : "border-transparent text-cos-muted hover:text-cos-text",
                )}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[12rem] flex-1 sm:flex-none sm:w-56">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => patchFilters({ search: event.target.value })}
              placeholder="Search campaigns..."
              className="h-9 w-full border border-cos-border bg-cos-bg py-0 pr-3 pl-9 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => onShowMoreFiltersChange(!showMoreFilters)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 border border-cos-border bg-cos-card px-3 text-xs font-medium text-cos-text hover:bg-cos-bg",
              showMoreFilters && "border-cos-dark bg-cos-bg-alt",
            )}
            aria-expanded={showMoreFilters}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            Filter
          </button>

          <label className="relative inline-flex items-center">
            <span className="sr-only">Sort campaigns</span>
            <select
              value={filters.sortField}
              onChange={(event) =>
                handleSortFieldChange(event.target.value as CampaignSortField)
              }
              aria-label="Sort campaigns"
              className="h-9 min-w-[9rem] cursor-pointer appearance-none border border-cos-border bg-cos-card py-0 pr-8 pl-3 text-xs text-cos-text outline-none focus:border-cos-dark"
            >
              {CAMPAIGN_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted"
              strokeWidth={1.5}
            />
          </label>

          <div className="inline-flex border border-cos-border bg-cos-card p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-cos-bg-alt text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <Grid3x3 className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-cos-bg-alt text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "space-y-3 border border-cos-border bg-cos-card p-4",
          !showMoreFilters && "hidden",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {schoolYearOptions.length > 1 && (
            <FilterSelect
              ariaLabel="Filter by school year"
              value={filters.schoolYear}
              options={schoolYearOptions}
              onChange={(value) => patchFilters({ schoolYear: value })}
            />
          )}
          <FilterSelect
            ariaLabel="Filter by month"
            value={filters.month}
            options={monthOptions}
            onChange={(value) => patchFilters({ month: value })}
          />
          <FilterSelect
            ariaLabel="Filter by status"
            value={filters.status}
            options={CAMPAIGN_STATUS_FILTER_OPTIONS}
            onChange={(value) => patchFilters({ status: value })}
          />
          <FilterSelect
            ariaLabel="Filter by type"
            value={filters.type}
            options={CAMPAIGN_TYPE_FILTER_OPTIONS}
            onChange={(value) => patchFilters({ type: value })}
          />

          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-medium text-cos-muted hover:text-cos-text"
          >
            Clear filters
          </button>
        </div>

        <div className="space-y-3 border-t border-cos-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                ariaLabel="Filter by chair or owner"
                value={filters.more.owner}
                options={ownerOptions}
                onChange={(value) => patchMore({ owner: value })}
              />
              <FilterSelect
                ariaLabel="Filter by platform"
                value={filters.more.platform}
                options={[
                  { value: "all", label: "All platforms" },
                  { value: "meta", label: "Meta scheduled" },
                  { value: "none", label: "Not on Meta" },
                ]}
                onChange={(value) => patchMore({ platform: value })}
              />
              <FilterSelect
                ariaLabel="Filter by approval status"
                value={filters.more.approvalStatus}
                options={[
                  { value: "all", label: "All approval statuses" },
                  { value: "draft", label: "Draft" },
                  { value: "scheduled", label: "Scheduled" },
                  { value: "published", label: "Published" },
                ]}
                onChange={(value) => patchMore({ approvalStatus: value })}
              />
              <FilterSelect
                ariaLabel="Filter by publish status"
                value={filters.more.publishStatus}
                options={[
                  { value: "all", label: "All publish statuses" },
                  { value: "not_scheduled", label: "Not scheduled" },
                  { value: "queued", label: "Queued" },
                  { value: "published", label: "Published" },
                ]}
                onChange={(value) => patchMore({ publishStatus: value })}
              />
              <FilterSelect
                ariaLabel="Filter by file status"
                value={filters.more.fileStatus}
                options={[
                  { value: "all", label: "All file statuses" },
                  { value: "has_files", label: "Has files" },
                  { value: "no_files", label: "No files" },
                ]}
                onChange={(value) => patchMore({ fileStatus: value })}
              />
              <FilterSelect
                ariaLabel="Filter by campaign type"
                value={filters.more.campaignType}
                options={[
                  { value: "all", label: "All campaign types" },
                  { value: "full_campaign", label: "Full campaign" },
                  { value: "reminder_only", label: "Reminders only" },
                  { value: "custom", label: "Custom" },
                ]}
                onChange={(value) => patchMore({ campaignType: value })}
              />
            </div>

            <label className="inline-flex h-9 items-center gap-2 border border-cos-border bg-cos-card px-2.5 text-xs text-cos-muted">
              Date range
              <input
                type="date"
                value={filters.more.dateStart}
                onChange={(event) => patchMore({ dateStart: event.target.value })}
                className="bg-transparent text-cos-text outline-none"
                aria-label="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={filters.more.dateEnd}
                onChange={(event) => patchMore({ dateEnd: event.target.value })}
                className="bg-transparent text-cos-text outline-none"
                aria-label="End date"
              />
            </label>
        </div>
      </div>
    </div>
  );
}
