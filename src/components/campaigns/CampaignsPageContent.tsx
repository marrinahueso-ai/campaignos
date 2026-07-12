"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignSummaryCards } from "@/components/campaigns/CampaignSummaryCards";
import { CampaignsGridView } from "@/components/campaigns/CampaignsGridView";
import { CampaignsTableView } from "@/components/campaigns/CampaignsTableView";
import { CampaignsToolbar } from "@/components/campaigns/CampaignsToolbar";
import { CampaignUpcomingSection } from "@/components/campaigns/CampaignUpcomingSection";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CAMPAIGNS_PAGE_SIZE,
  countBySummaryFilter,
  createDefaultCampaignFilters,
  filterCampaignEvents,
  getUpcomingCampaignEvents,
  paginateCampaignEvents,
  sortCampaignEvents,
  totalCampaignPages,
  type CampaignPageFilterState,
  type CampaignSortField,
  type CampaignSummaryFilter,
  type CampaignViewMode,
} from "@/lib/events/campaign-page-filters";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

interface CampaignsPageContentProps {
  events: Event[];
  today: string;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
  eventIdsWithFiles?: Set<string>;
  schoolYears?: Array<{ id: string; label: string }>;
  activeSchoolYearId?: string | null;
}

export function CampaignsPageContent({
  events,
  today,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
  eventIdsWithFiles,
  schoolYears = [],
  activeSchoolYearId = null,
}: CampaignsPageContentProps) {
  const [filters, setFilters] = useState<CampaignPageFilterState>(() =>
    createDefaultCampaignFilters(activeSchoolYearId),
  );
  const [viewMode, setViewMode] = useState<CampaignViewMode>("list");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);

  const filterContext = useMemo(
    () => ({
      today,
      metaScheduledEventIds,
      ownershipByEventId,
      eventIdsWithFiles,
    }),
    [today, metaScheduledEventIds, ownershipByEventId, eventIdsWithFiles],
  );

  const baseFilteredEvents = useMemo(() => {
    return filterCampaignEvents(
      events,
      { ...filters, summary: "all" },
      filterContext,
    );
  }, [events, filters, filterContext]);

  const summaryCounts = useMemo(
    () =>
      countBySummaryFilter(
        baseFilteredEvents,
        today,
        metaScheduledEventIds ?? new Set(),
      ),
    [baseFilteredEvents, today, metaScheduledEventIds],
  );

  const filteredEvents = useMemo(() => {
    const filtered = filterCampaignEvents(events, filters, filterContext);
    return sortCampaignEvents(
      filtered,
      filters.sortField,
      filters.sortDirection,
      filterContext,
    );
  }, [events, filters, filterContext]);

  const upcomingEvents = useMemo(
    () => getUpcomingCampaignEvents(filteredEvents, today),
    [filteredEvents, today],
  );

  const pageCount = totalCampaignPages(filteredEvents.length, CAMPAIGNS_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount);
  const paginatedEvents = paginateCampaignEvents(
    filteredEvents,
    currentPage,
    CAMPAIGNS_PAGE_SIZE,
  );
  const rangeStart =
    filteredEvents.length === 0 ? 0 : (currentPage - 1) * CAMPAIGNS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * CAMPAIGNS_PAGE_SIZE, filteredEvents.length);

  const hasAnyCampaigns = events.length > 0;
  const hasFilteredResults = filteredEvents.length > 0;

  function updateFilters(next: CampaignPageFilterState) {
    setFilters(next);
    setPage(1);
  }

  function handleSummaryFilterChange(summary: CampaignSummaryFilter) {
    updateFilters({ ...filters, summary });
  }

  function handleClearFilters() {
    updateFilters(createDefaultCampaignFilters(activeSchoolYearId));
    setShowMoreFilters(false);
  }

  function handleSort(field: CampaignSortField) {
    if (filters.sortField === field) {
      updateFilters({
        ...filters,
        sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
      });
      return;
    }

    const defaultDirection =
      field === "updated" || field === "date" || field === "upcoming"
        ? "asc"
        : "asc";
    updateFilters({
      ...filters,
      sortField: field,
      sortDirection: defaultDirection,
    });
  }

  return (
    <div className="space-y-8">
      <CampaignsToolbar
        events={events}
        filters={filters}
        viewMode={viewMode}
        showMoreFilters={showMoreFilters}
        ownershipByEventId={ownershipByEventId}
        schoolYears={schoolYears}
        onFiltersChange={updateFilters}
        onViewModeChange={setViewMode}
        onShowMoreFiltersChange={setShowMoreFilters}
        onClearFilters={handleClearFilters}
      />

      <CampaignSummaryCards
        counts={summaryCounts}
        activeFilter={filters.summary}
        onFilterChange={handleSummaryFilterChange}
      />

      {!hasAnyCampaigns ? (
        <EmptyState
          icon={CalendarDays}
          title="No active campaigns"
          description="Calendar-only dates live on the Calendar. Reminder-only and full campaigns appear here once you import them with a social plan or start a campaign from an event page."
          action={{ label: "Open calendar", href: "/calendar" }}
          className="border border-cos-border bg-cos-card py-16"
        />
      ) : !hasFilteredResults ? (
        <div className="border border-cos-border bg-cos-card py-16">
          <EmptyState
            icon={CalendarDays}
            title="No campaigns match your filters"
            description="Try adjusting your search or filter selections to see more campaigns."
          />
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs tracking-[0.14em] text-cos-text uppercase transition-colors hover:text-cos-muted"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <>
          <CampaignUpcomingSection
            events={upcomingEvents}
            today={today}
            artworkByEventId={artworkByEventId}
            ownershipByEventId={ownershipByEventId}
            metaScheduledEventIds={metaScheduledEventIds}
          />

          <section className="space-y-4">
            <h2 className="font-display text-2xl text-cos-text">All campaigns</h2>

            {viewMode === "list" ? (
              <CampaignsTableView
                events={paginatedEvents}
                today={today}
                artworkByEventId={artworkByEventId}
                ownershipByEventId={ownershipByEventId}
                metaScheduledEventIds={metaScheduledEventIds}
                sortField={filters.sortField}
                sortDirection={filters.sortDirection}
                onSort={handleSort}
              />
            ) : (
              <CampaignsGridView
                events={paginatedEvents}
                today={today}
                artworkByEventId={artworkByEventId}
                ownershipByEventId={ownershipByEventId}
                metaScheduledEventIds={metaScheduledEventIds}
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-cos-muted">
                Showing {rangeStart}–{rangeEnd} of {filteredEvents.length}{" "}
                {filteredEvents.length === 1 ? "campaign" : "campaigns"}
              </p>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-8 w-8 items-center justify-center border border-cos-border bg-cos-card text-cos-muted disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: pageCount }, (_, index) => index + 1)
                  .filter((pageNumber) => {
                    if (pageCount <= 5) return true;
                    if (pageNumber === 1 || pageNumber === pageCount) return true;
                    return Math.abs(pageNumber - currentPage) <= 1;
                  })
                  .map((pageNumber, index, visible) => {
                    const prev = visible[index - 1];
                    const showEllipsis = prev !== undefined && pageNumber - prev > 1;
                    return (
                      <span key={pageNumber} className="inline-flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-cos-muted">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={cn(
                            "flex h-8 min-w-8 items-center justify-center border text-xs font-medium",
                            pageNumber === currentPage
                              ? "border-cos-accent bg-cos-bg-alt text-cos-text"
                              : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
                          )}
                        >
                          {pageNumber}
                        </button>
                      </span>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={currentPage >= pageCount}
                  className="flex h-8 w-8 items-center justify-center border border-cos-border bg-cos-card text-cos-muted disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
