"use client";

import { useState } from "react";
import { ChevronRight, CalendarDays, Sun } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  CampaignMonthGroup,
  SortedCampaignMonthGroups,
} from "@/lib/events/campaign-page-utils";
import { isPastCampaignMonth } from "@/lib/events/campaign-page-utils";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { cn } from "@/lib/utils/cn";

interface CampaignEventsListProps {
  monthGroups: SortedCampaignMonthGroups;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
  today: string;
  defaultExpandedAll?: boolean;
}

function CampaignMonthSection({
  group,
  muted = false,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
  defaultExpanded = false,
}: {
  group: CampaignMonthGroup;
  muted?: boolean;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const count = group.events.length;
  const countLabel = `${count} ${count === 1 ? "campaign" : "campaigns"}`;

  return (
    <section className="border-b border-cos-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-cos-bg/30 sm:px-5"
        aria-expanded={open}
      >
        <span className="shrink-0 text-cos-muted">
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
            aria-hidden
          />
        </span>
        <Sun className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <span
          className={cn(
            "font-display min-w-0 flex-1 text-xl sm:text-2xl",
            muted ? "text-cos-muted" : "text-cos-text",
          )}
        >
          {group.label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-cos-muted">{countLabel}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cos-bg text-xs font-medium tabular-nums text-cos-muted">
            {count}
          </span>
        </span>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-cos-border bg-cos-bg/20 p-5 md:grid-cols-2 xl:grid-cols-3">
          {group.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              artwork={artworkByEventId.get(event.id) ?? null}
              ownership={ownershipByEventId?.get(event.id) ?? null}
              metaPublicationScheduled={metaScheduledEventIds?.has(event.id) ?? false}
              showRemoveFromCampaigns
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CampaignEventsList({
  monthGroups,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
  today,
  defaultExpandedAll = false,
}: CampaignEventsListProps) {
  const { activeGroups, pastGroups } = monthGroups;
  const totalGroups = activeGroups.length + pastGroups.length;
  const currentMonthKey = today.slice(0, 7);

  if (totalGroups === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No campaigns in this period"
        description="Try adjusting your filters or switch to list view to browse all campaigns."
        className="rounded-xl border border-cos-border bg-white py-16"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cos-border bg-white">
      {activeGroups.map((group) => (
        <CampaignMonthSection
          key={group.key}
          group={group}
          artworkByEventId={artworkByEventId}
          ownershipByEventId={ownershipByEventId}
          metaScheduledEventIds={metaScheduledEventIds}
          defaultExpanded={defaultExpandedAll || group.key === currentMonthKey}
        />
      ))}

      {pastGroups.length > 0 && (
        <>
          <div className="border-b border-cos-border bg-cos-bg/40 px-5 py-2.5">
            <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Past months
            </p>
          </div>
          {pastGroups.map((group) => (
            <CampaignMonthSection
              key={group.key}
              group={group}
              muted={isPastCampaignMonth(group, today)}
              artworkByEventId={artworkByEventId}
              ownershipByEventId={ownershipByEventId}
              metaScheduledEventIds={metaScheduledEventIds}
              defaultExpanded={defaultExpandedAll}
            />
          ))}
        </>
      )}
    </div>
  );
}
