"use client";

import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { CampaignRowActions } from "@/components/campaigns/CampaignRowActions";
import { CampaignStatusPill } from "@/components/campaigns/CampaignStatusPill";
import { CampaignThumbnail } from "@/components/campaigns/CampaignThumbnail";
import { Button } from "@/components/ui/Button";
import {
  getCampaignDisplayStatus,
  getCampaignTypeLabel,
  getEventOwnerName,
} from "@/lib/events/campaign-page-filters";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";

interface CampaignsGridViewProps {
  events: Event[];
  today: string;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
}

export function CampaignsGridView({
  events,
  today,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
}: CampaignsGridViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => {
        const ownership = ownershipByEventId?.get(event.id);
        const metaScheduled = metaScheduledEventIds?.has(event.id) ?? false;
        const displayStatus = getCampaignDisplayStatus(event, {
          metaScheduled,
          ownership,
          today,
        });
        const formattedTime = formatEventTime(event.time);

        return (
          <article
            key={event.id}
            className="flex flex-col border border-cos-border bg-cos-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <CampaignThumbnail
                  artwork={artworkByEventId.get(event.id) ?? null}
                  title={event.title}
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate text-sm font-semibold text-cos-text">
                    {event.title}
                  </h3>
                  <p className="text-xs text-cos-muted">
                    {getCampaignTypeLabel(event.communicationStrategy)}
                  </p>
                </div>
              </div>
              <CampaignRowActions event={event} compact />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cos-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
                {formatEventDate(event.date)}
              </span>
              {formattedTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {formattedTime}
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-cos-muted">
              Owner · {getEventOwnerName(event, ownership)}
            </p>

            <div className="mt-3">
              <CampaignStatusPill status={displayStatus} />
            </div>

            <div className="mt-4 border-t border-cos-border pt-3">
              <Button href={`/events/${event.id}`} variant="secondary" size="sm" className="w-full">
                Open planning hub
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
