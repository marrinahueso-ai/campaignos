"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { CampaignsToolbar } from "@/components/campaigns/CampaignsToolbar";
import { CampaignsListView } from "@/components/campaigns/CampaignsListView";
import { CampaignEventsList } from "@/components/events/CampaignEventsList";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  filterCampaignEvents,
  type CampaignStatusFilter,
  type CampaignTypeFilter,
  type CampaignViewMode,
} from "@/lib/events/campaign-page-filters";
import {
  groupEventsByMonth,
  sortCampaignMonthGroups,
  type SortedCampaignMonthGroups,
} from "@/lib/events/campaign-page-utils";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";

interface CampaignsPageContentProps {
  events: Event[];
  today: string;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
}

export function CampaignsPageContent({
  events,
  today,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
}: CampaignsPageContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<CampaignTypeFilter>("all");
  const [viewMode, setViewMode] = useState<CampaignViewMode>("month");

  const filteredEvents = useMemo(
    () =>
      filterCampaignEvents(events, {
        search: searchQuery,
        statusFilter,
        typeFilter,
      }),
    [events, searchQuery, statusFilter, typeFilter],
  );

  const monthGroups: SortedCampaignMonthGroups = useMemo(() => {
    const groups = groupEventsByMonth(filteredEvents);
    return sortCampaignMonthGroups(groups, today);
  }, [filteredEvents, today]);

  const hasAnyCampaigns = events.length > 0;
  const hasFilteredResults = filteredEvents.length > 0;

  return (
    <div className="space-y-6">
      <CampaignsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
        <EmptyState
          icon={CalendarDays}
          title="No campaigns match your filters"
          description="Try adjusting your search or filter selections to see more campaigns."
          className="border border-cos-border bg-cos-card py-16"
        />
      ) : viewMode === "month" ? (
        <CampaignEventsList
          monthGroups={monthGroups}
          today={today}
          artworkByEventId={artworkByEventId}
          ownershipByEventId={ownershipByEventId}
          metaScheduledEventIds={metaScheduledEventIds}
        />
      ) : (
        <div className="overflow-hidden border border-cos-border bg-cos-card">
          <CampaignsListView
            events={filteredEvents}
            artworkByEventId={artworkByEventId}
            ownershipByEventId={ownershipByEventId}
            metaScheduledEventIds={metaScheduledEventIds}
          />
        </div>
      )}
    </div>
  );
}
