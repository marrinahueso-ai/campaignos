"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  CampaignMonthGroup,
  SortedCampaignMonthGroups,
} from "@/lib/events/campaign-page-utils";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { cn } from "@/lib/utils/cn";

interface CampaignEventsListProps {
  monthGroups: SortedCampaignMonthGroups;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
}

function CampaignMonthSection({
  group,
  muted = false,
  artworkByEventId,
  ownershipByEventId,
}: {
  group: CampaignMonthGroup;
  muted?: boolean;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={cn(
        "overflow-hidden border bg-cos-card",
        muted ? "border-cos-border/60" : "border-cos-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-start gap-2 px-4 py-4 text-left",
          open && "border-b border-cos-border",
        )}
        aria-expanded={open}
      >
        <span className="mt-1 shrink-0 rounded-lg p-1 text-cos-muted">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <span
            className={cn(
              "font-display text-2xl",
              muted ? "text-cos-muted" : "text-cos-text",
            )}
          >
            {group.label}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
              muted ? "bg-cos-bg text-cos-muted" : "bg-cos-bg text-cos-muted",
            )}
          >
            {group.events.length} {group.events.length === 1 ? "campaign" : "campaigns"}
          </span>
        </span>
      </button>

      {open && (
        <div className="grid gap-6 p-5 md:grid-cols-2 xl:grid-cols-3">
          {group.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              artwork={artworkByEventId.get(event.id) ?? null}
              ownership={ownershipByEventId?.get(event.id) ?? null}
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
}: CampaignEventsListProps) {
  const { activeGroups, pastGroups } = monthGroups;
  const totalGroups = activeGroups.length + pastGroups.length;

  if (totalGroups === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No active campaigns"
        description="Calendar-only dates live on the Calendar. Reminder-only and full campaigns appear here once you import them with a social plan or start a campaign from an event page."
        action={{ label: "Open calendar", href: "/calendar" }}
        className="border border-cos-border bg-cos-card py-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      {activeGroups.map((group) => (
        <CampaignMonthSection
          key={group.key}
          group={group}
          artworkByEventId={artworkByEventId}
          ownershipByEventId={ownershipByEventId}
        />
      ))}

      {pastGroups.length > 0 && (
        <div className="space-y-4 pt-4">
          <p className="cos-section-title px-1">Past months</p>
          {pastGroups.map((group) => (
            <CampaignMonthSection
              key={group.key}
              group={group}
              muted
              artworkByEventId={artworkByEventId}
              ownershipByEventId={ownershipByEventId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
